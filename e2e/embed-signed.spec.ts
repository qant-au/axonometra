import { test, expect, Page } from '@playwright/test';
import { createSign } from 'node:crypto';

// Signed embedding end to end: a fake host page on http://127.0.0.1:4891 frames
// the editor with ?embed=1 and talks to it over postMessage. The dev server
// was started with this run's public key (playwright.config.ts), and the
// matching private key signs here, as the host's backend would.

// Same port, different origin from the editor's http://localhost:4891.
const HOST = 'http://127.0.0.1:4891';
const PRIVATE_KEY = process.env.AXO_E2E_PLAN_PRIVATE_KEY ?? '';

function sign(plan: string, expires: number, session: string) {
  const signer = createSign('SHA256');
  signer.update(`axo-plan-v1\n${expires}\n${session}\n${plan}`);
  return signer.sign(PRIVATE_KEY).toString('base64');
}

type Msg = { type: string; [k: string]: unknown };

async function openHost(page: Page, baseURL: string) {
  const axoOrigin = new URL(baseURL).origin;
  // The host document is written into a real page on the host origin, not
  // served by page.route: a route-fulfilled response has no network address,
  // so Chrome's Local Network Access check would block it framing localhost.
  await page.goto(`${HOST}/robots.txt`);
  await page.setContent(
    `<!doctype html><iframe id="axo" src="${baseURL}/?embed=1"
      style="width:1000px;height:600px;border:0"></iframe>
      <script>
        window.received = [];
        addEventListener('message', (e) => {
          if (e.origin === ${JSON.stringify(axoOrigin)}) received.push(e.data);
        });
        window.sendToAxo = (msg) => document.getElementById('axo')
          .contentWindow.postMessage(msg, ${JSON.stringify(axoOrigin)});
      </script>`
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { received: Msg[] }).received.map((m) => m.type)
      )
    )
    .toContain('axo:ready');
}

async function send(page: Page, msg: Msg) {
  await page.evaluate(
    (m) =>
      (window as unknown as { sendToAxo: (m: unknown) => void }).sendToAxo(m),
    msg
  );
}

async function lastReply(page: Page, type: string): Promise<Msg> {
  let found: Msg | undefined;
  await expect
    .poll(async () => {
      const all = await page.evaluate(
        () => (window as unknown as { received: Msg[] }).received
      );
      found = [...all].reverse().find((m) => m.type === type);
      return !!found;
    })
    .toBe(true);
  return found!;
}

async function clearReplies(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { received: Msg[] }).received.length = 0;
  });
}

// A real plan with one wall, captured from the editor itself.
async function capturePlan(page: Page, baseURL: string): Promise<string> {
  await page.goto(baseURL);
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  await page.waitForFunction(
    () =>
      !!(
        window as unknown as {
          __axo?: { getMain: () => { bkgPattern?: unknown } };
        }
      ).__axo?.getMain().bkgPattern
  );
  await page.evaluate(() =>
    (
      window as unknown as {
        __axo: { getStore: () => { setTool: (n: number) => void } };
      }
    ).__axo
      .getStore()
      .setTool(0)
  );
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 200, box.y + box.height / 2);
  await page.keyboard.press('Control+s');
  return page.evaluate(() => localStorage.getItem('autosave') ?? '');
}

test.describe('signed embedding', () => {
  test.skip(!PRIVATE_KEY, 'needs the key pair from playwright.config.ts');

  test('loads a signed plan, echoes the session, and refuses tampering', async ({
    page,
    baseURL
  }) => {
    const plan = await capturePlan(page, baseURL!);
    expect(JSON.parse(plan).floors[0].wallNodes.length).toBe(2);

    await openHost(page, baseURL!);
    const expires = Math.floor(Date.now() / 1000) + 300;

    // Unsigned: refused.
    await send(page, { type: 'axo:load', plan });
    expect(await lastReply(page, 'axo:error')).toMatchObject({
      code: 'missing-signature'
    });

    // Signed for this session: loaded, and saves carry the session back.
    await clearReplies(page);
    await send(page, {
      type: 'axo:load',
      plan,
      expires,
      session: 'sess-42',
      signature: sign(plan, expires, 'sess-42')
    });
    expect(await lastReply(page, 'axo:loaded')).toEqual({
      type: 'axo:loaded',
      session: 'sess-42'
    });
    await send(page, { type: 'axo:request-save' });
    const saved = await lastReply(page, 'axo:save');
    expect(saved.session).toBe('sess-42');
    expect(JSON.parse(saved.plan as string).floors[0].wallNodes.length).toBe(2);

    // Tampered plan (one node dropped) with the old signature: refused, and
    // the editor still holds the signed plan.
    const tampered = JSON.parse(plan);
    tampered.floors[0].wallNodes.pop();
    await clearReplies(page);
    await send(page, {
      type: 'axo:load',
      plan: JSON.stringify(tampered),
      expires,
      session: 'sess-42',
      signature: sign(plan, expires, 'sess-42')
    });
    expect(await lastReply(page, 'axo:error')).toMatchObject({
      code: 'bad-signature'
    });
    await send(page, { type: 'axo:request-save' });
    const after = await lastReply(page, 'axo:save');
    expect(JSON.parse(after.plan as string).floors[0].wallNodes.length).toBe(2);
  });
});
