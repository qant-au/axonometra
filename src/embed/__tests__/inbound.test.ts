import { createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { AxoOutbound, createInboundHandler } from '../inbound';
import { signedMessage } from '../planSignature';

// A host backend as integrators will write it: Node's crypto, whose default
// ECDSA output is DER, which the editor accepts alongside raw r||s.
const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256'
});
const PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'der' })
  .toString('base64');

function hostSign(plan: string, expires: number, session?: string) {
  const signer = createSign('SHA256');
  signer.update(signedMessage(plan, expires, session));
  return signer.sign(privateKey).toString('base64');
}

const PLAN = '{"version":1,"floors":[],"furnitureId":0,"wallNodeId":0}';
const NOW_MS = 1_800_000_000_000;
const EXPIRES = NOW_MS / 1000 + 300;

function setup(publicKeys: string[], loadResult = true) {
  const deps = {
    publicKeys,
    load: vi.fn(() => loadResult),
    serialize: vi.fn(() => 'CURRENT'),
    exportGlb: vi.fn(async () => new ArrayBuffer(4)),
    notify: vi.fn(),
    now: () => NOW_MS
  };
  const replies: AxoOutbound[] = [];
  const handle = createInboundHandler(deps);
  const send = (message: Parameters<typeof handle>[0]) =>
    handle(message, (out) => replies.push(out));
  return { deps, replies, send };
}

describe('unsigned mode (no public keys configured)', () => {
  it('loads string and object plans and echoes the session on save', async () => {
    const { deps, replies, send } = setup([]);
    await send({ type: 'axo:load', plan: JSON.parse(PLAN), session: 'abc' });
    expect(deps.load).toHaveBeenCalledWith(PLAN);
    await send({ type: 'axo:request-save' });
    expect(replies).toEqual([
      { type: 'axo:loaded', session: 'abc' },
      { type: 'axo:save', plan: 'CURRENT', session: 'abc' }
    ]);
  });

  it('answers axo:ready?', async () => {
    const { replies, send } = setup([]);
    await send({ type: 'axo:ready?' });
    expect(replies).toEqual([{ type: 'axo:ready' }]);
  });

  it('reports a plan the serializer rejected without a second toast', async () => {
    const { deps, replies, send } = setup([], false);
    await send({ type: 'axo:load', plan: 'nonsense' });
    expect(deps.notify).not.toHaveBeenCalled();
    expect(replies[0]).toMatchObject({
      type: 'axo:error',
      code: 'invalid-plan'
    });
  });
});

describe('signed mode', () => {
  it('loads a plan signed by the host, bound to its session', async () => {
    const { deps, replies, send } = setup([PUBLIC_KEY]);
    await send({
      type: 'axo:load',
      plan: PLAN,
      signature: hostSign(PLAN, EXPIRES, 'sess-1'),
      expires: EXPIRES,
      session: 'sess-1'
    });
    expect(deps.load).toHaveBeenCalledWith(PLAN);
    expect(replies).toEqual([{ type: 'axo:loaded', session: 'sess-1' }]);
  });

  it.each([
    ['no signature', {}, 'missing-signature'],
    [
      'a replay into another session',
      { signature: hostSign(PLAN, EXPIRES, 'sess-1'), session: 'sess-2' },
      'bad-signature'
    ],
    [
      'an expired signature',
      {
        signature: hostSign(PLAN, NOW_MS / 1000 - 1),
        expires: NOW_MS / 1000 - 1
      },
      'expired'
    ]
  ])('refuses %s', async (_label, extra, code) => {
    const { deps, replies, send } = setup([PUBLIC_KEY]);
    await send({ type: 'axo:load', plan: PLAN, expires: EXPIRES, ...extra });
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalled();
    expect(replies).toEqual([
      expect.objectContaining({ type: 'axo:error', code })
    ]);
  });

  it('refuses an object plan, whose bytes cannot match the signature', async () => {
    const { deps, replies, send } = setup([PUBLIC_KEY]);
    await send({
      type: 'axo:load',
      plan: JSON.parse(PLAN),
      signature: hostSign(PLAN, EXPIRES),
      expires: EXPIRES
    });
    expect(deps.load).not.toHaveBeenCalled();
    expect(replies[0]).toMatchObject({ code: 'unsigned-object-plan' });
  });

  it('keeps the previous session when a load is refused', async () => {
    const { replies, send } = setup([PUBLIC_KEY]);
    await send({
      type: 'axo:load',
      plan: PLAN,
      signature: hostSign(PLAN, EXPIRES, 'good'),
      expires: EXPIRES,
      session: 'good'
    });
    await send({ type: 'axo:load', plan: PLAN, session: 'forged' });
    await send({ type: 'axo:request-save' });
    expect(replies.at(-1)).toEqual({
      type: 'axo:save',
      plan: 'CURRENT',
      session: 'good'
    });
  });

  it('lets only the newest of two overlapping loads land', async () => {
    const { deps, send } = setup([PUBLIC_KEY]);
    const first = send({
      type: 'axo:load',
      plan: PLAN,
      signature: hostSign(PLAN, EXPIRES, 'one'),
      expires: EXPIRES,
      session: 'one'
    });
    const second = send({
      type: 'axo:load',
      plan: PLAN,
      signature: hostSign(PLAN, EXPIRES, 'two'),
      expires: EXPIRES,
      session: 'two'
    });
    await Promise.all([first, second]);
    expect(deps.load).toHaveBeenCalledTimes(1);
  });
});

describe('axo:export', () => {
  it('replies with the plan as a glb, and the session', async () => {
    const { deps, replies, send } = setup([]);
    await send({ type: 'axo:load', plan: PLAN, session: 's' });
    await send({ type: 'axo:export', format: 'glb' });
    expect(deps.exportGlb).toHaveBeenCalledWith('CURRENT');
    expect(replies[1]).toEqual({
      type: 'axo:exported',
      format: 'glb',
      data: new ArrayBuffer(4),
      session: 's'
    });
  });

  it('defaults to glb', async () => {
    const { replies, send } = setup([]);
    await send({ type: 'axo:export' });
    expect(replies[0]).toMatchObject({ type: 'axo:exported', format: 'glb' });
  });

  it('refuses another format without toasting the person editing', async () => {
    const { deps, replies, send } = setup([]);
    await send({ type: 'axo:export', format: 'obj' });
    expect(deps.exportGlb).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
    expect(replies[0]).toMatchObject({
      type: 'axo:error',
      code: 'unsupported-format'
    });
  });

  it('reports an export that throws', async () => {
    const { deps, replies, send } = setup([]);
    deps.exportGlb.mockRejectedValueOnce(new Error('boom'));
    await send({ type: 'axo:export' });
    expect(replies[0]).toMatchObject({
      type: 'axo:error',
      code: 'export-failed'
    });
  });
});
