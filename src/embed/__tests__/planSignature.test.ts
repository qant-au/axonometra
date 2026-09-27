import { beforeAll, describe, expect, it } from 'vitest';
import {
  derToP1363,
  importPublicKeys,
  parsePublicKeys,
  signedMessage,
  verifySignedPlan
} from '../planSignature';

// Keys are generated per run with Node's WebCrypto; nothing is committed.
let signer: CryptoKeyPair;
let other: CryptoKeyPair;
let publicB64: string;

const toB64 = (buf: ArrayBuffer) => Buffer.from(buf).toString('base64');

async function sign(
  key: CryptoKey,
  plan: string,
  expires: number,
  session?: string
) {
  return toB64(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signedMessage(plan, expires, session)
    )
  );
}

const NOW = 1_800_000_000;
const PLAN = '{"version":1,"floors":[],"furnitureId":0,"wallNodeId":0}';

beforeAll(async () => {
  const params = { name: 'ECDSA', namedCurve: 'P-256' } as const;
  signer = await crypto.subtle.generateKey(params, true, ['sign', 'verify']);
  other = await crypto.subtle.generateKey(params, true, ['sign', 'verify']);
  publicB64 = toB64(await crypto.subtle.exportKey('spki', signer.publicKey));
});

describe('verifySignedPlan', () => {
  it('accepts a plan signed by a configured key', async () => {
    const keys = await importPublicKeys([publicB64]);
    const signature = await sign(signer.privateKey, PLAN, NOW + 60, 's1');
    expect(
      await verifySignedPlan(
        { plan: PLAN, signature, expires: NOW + 60, session: 's1' },
        keys,
        NOW
      )
    ).toBe('ok');
  });

  it('refuses a changed plan, session or expiry', async () => {
    const keys = await importPublicKeys([publicB64]);
    const signature = await sign(signer.privateKey, PLAN, NOW + 60, 's1');
    const base = { plan: PLAN, signature, expires: NOW + 60, session: 's1' };
    expect(
      await verifySignedPlan({ ...base, plan: PLAN + ' ' }, keys, NOW)
    ).toBe('bad-signature');
    expect(await verifySignedPlan({ ...base, session: 's2' }, keys, NOW)).toBe(
      'bad-signature'
    );
    expect(
      await verifySignedPlan({ ...base, expires: NOW + 61 }, keys, NOW)
    ).toBe('bad-signature');
  });

  it('refuses a signature from an unknown key', async () => {
    const keys = await importPublicKeys([publicB64]);
    const signature = await sign(other.privateKey, PLAN, NOW + 60);
    expect(
      await verifySignedPlan(
        { plan: PLAN, signature, expires: NOW + 60 },
        keys,
        NOW
      )
    ).toBe('bad-signature');
  });

  it('accepts any key in a rotation list', async () => {
    const otherB64 = toB64(
      await crypto.subtle.exportKey('spki', other.publicKey)
    );
    const keys = await importPublicKeys(
      parsePublicKeys(`${publicB64}, ${otherB64}`)
    );
    const signature = await sign(other.privateKey, PLAN, NOW + 60);
    expect(
      await verifySignedPlan(
        { plan: PLAN, signature, expires: NOW + 60 },
        keys,
        NOW
      )
    ).toBe('ok');
  });

  it('refuses missing signatures, missing expiry and expired plans', async () => {
    const keys = await importPublicKeys([publicB64]);
    const signature = await sign(signer.privateKey, PLAN, NOW - 1);
    expect(await verifySignedPlan({ plan: PLAN }, keys, NOW)).toBe(
      'missing-signature'
    );
    expect(await verifySignedPlan({ plan: PLAN, signature }, keys, NOW)).toBe(
      'missing-expiry'
    );
    expect(
      await verifySignedPlan(
        { plan: PLAN, signature, expires: NOW - 1 },
        keys,
        NOW
      )
    ).toBe('expired');
  });

  it('accepts base64url signatures and PEM-wrapped keys', async () => {
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicB64.replace(/(.{64})/g, '$1\n')}\n-----END PUBLIC KEY-----`;
    const keys = await importPublicKeys([pem]);
    const signature = (await sign(signer.privateKey, PLAN, NOW + 60))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(
      await verifySignedPlan(
        { plan: PLAN, signature, expires: NOW + 60 },
        keys,
        NOW
      )
    ).toBe('ok');
  });

  it('skips keys that do not import', async () => {
    expect(await importPublicKeys(['not-a-key'])).toEqual([]);
  });
});

describe('derToP1363', () => {
  it('converts a DER signature with sign-padded integers', () => {
    const r = new Uint8Array(32).fill(0x81);
    const s = new Uint8Array(31).fill(0x02);
    const der = new Uint8Array([
      0x30,
      0x44,
      0x02,
      0x21,
      0x00,
      ...r,
      0x02,
      0x1f,
      ...s
    ]);
    const out = derToP1363(der)!;
    expect(out).toHaveLength(64);
    expect([...out.subarray(0, 32)]).toEqual([...r]);
    expect(out[32]).toBe(0);
    expect([...out.subarray(33)]).toEqual([...s]);
  });

  it('returns null for something that is not DER', () => {
    expect(derToP1363(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
