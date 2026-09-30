import { inflateSync } from 'node:zlib';
import { test, expect, Page } from '@playwright/test';

// The production bundle under the container's Content-Security-Policy, used
// the way a person uses it: nothing here reaches for window.__axo, which a
// build does not have. The 3D view's description is the visible read-out of
// what the plan holds. It exists because every other spec ran against the
// dev server, which has no CSP, while the container refused Pixi's
// shader compiler and could not draw anything at all.

async function openThreeD(page: Page) {
  await page.getByRole('button', { name: '3D view' }).click();
  const view = page.getByRole('img', { name: /^3D view of/ });
  await expect(view).toBeVisible({ timeout: 10_000 });
  const label = (await view.getAttribute('aria-label')) ?? '';
  await page
    .getByRole('dialog', { name: '3D view' })
    .getByRole('button', { name: 'Close' })
    .click();
  return label;
}

test('draw walls, add furniture, save and load, under the container CSP', async ({
  page
}) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);

  // Draw two walls with the Draw wall tool.
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  const canvas = page.getByRole('application', { name: 'Floor plan' });
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // At a person's pace. Clicked back to back while the whole suite was
  // running, the last wall was sometimes missing; the cause is not
  // established (the editor ends a chain on a repeat click of the same point,
  // with no timing), and no person clicks this fast.
  for (const [x, y] of [
    [cx, cy],
    [cx + 200, cy],
    [cx + 200, cy + 200]
  ]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape');

  // Add a rack from the furniture drawer.
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Comms and server room' }).click();
  await drawer.getByAltText('Server rack 42U, 600 × 1200').click();
  await page.keyboard.press('Escape');

  expect(await openThreeD(page)).toMatch(/2 walls and 1 piece of furniture/);

  // Save to the browser, reload, and load it back.
  await page.keyboard.press('ControlOrMeta+s');
  await page.reload();
  await page.getByRole('button', { name: /load from local save/i }).click();
  expect(await openThreeD(page)).toMatch(/2 walls and 1 piece of furniture/);

  expect(problems).toEqual([]);
});

// The colour of one screen pixel, read from a screenshot (a WebGL canvas
// cannot be read back from the page, and the CSP refuses a data: fetch).
// A 1 x 1 PNG is one scanline, a filter byte then RGB(A), deflated across
// one or more IDAT chunks.
async function pixelAt(page: Page, x: number, y: number) {
  const png = await page.screenshot({
    clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }
  });
  const data: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    if (type === 'IDAT') data.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const row = inflateSync(Buffer.concat(data));
  return [row[1], row[2], row[3]];
}

test('doors and windows draw their images, not black shapes, and nothing is evaluated', async ({
  page
}) => {
  // A script-src violation is reported even when the code that tripped it
  // catches the error (zod's eval probe did, on every load).
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // Chrome reports a refused texture upload as a warning.
    if (m.type() === 'error' || /texImage2D|WebGL: INVALID/.test(m.text()))
      problems.push(`console ${m.type()}: ${m.text()}`);
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);

  const addMenu = async (item: string) => {
    await page.getByRole('button', { name: 'Add', exact: true }).hover();
    await page.getByRole('menuitem', { name: item }).click();
  };
  await addMenu('Draw wall');
  const box = (await page
    .getByRole('application', { name: 'Floor plan' })
    .boundingBox())!;
  const x0 = box.x + box.width / 2 - 150;
  const y0 = box.y + box.height / 2 - 100;
  for (const [x, y] of [
    [x0, y0],
    [x0 + 300, y0],
    [x0 + 300, y0 + 200],
    [x0, y0 + 200],
    [x0, y0]
  ]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape');

  // A door on the bottom wall: it swings out below it, 80 cm (80 px) square.
  await addMenu('Add door');
  await page.mouse.click(x0 + 100, y0 + 200);
  await page.waitForTimeout(500);
  await addMenu('Add window');
  await page.mouse.click(x0 + 100, y0);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.mouse.move(box.x + 5, box.y + box.height - 5);
  await page.waitForTimeout(300);

  // Inside the door's swing is open floor, not a black square.
  const [r, g, b] = await pixelAt(page, x0 + 150, y0 + 250);
  expect(r + g + b).toBeGreaterThan(300);

  expect(problems).toEqual([]);
});
