import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { hasAxo } from './axo';

// Save plan image: the PNG keeps clear space around the plan, so a wall label
// or an item on the edge of the drawing never touches the image border.
// Uses the DEV-only window.__axo handle like undo-redo.spec.ts.

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
};

test('the saved plan image has a clear margin on every side', async ({
  page
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0, {
    timeout: 3000
  });
  test.skip(
    !(await hasAxo(page)),
    'window.__axo is only present in DEV builds'
  );
  await page.waitForFunction(
    () => !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern,
    undefined,
    { timeout: 5000 }
  );
  await page.evaluate(() =>
    (window as unknown as { __axo: Axo }).__axo.getStore().setTool(0)
  );
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx - 150, cy - 100);
  await page.mouse.click(cx + 150, cy - 100);
  await page.mouse.click(cx + 150, cy + 100);
  await page.mouse.click(cx - 150, cy + 100);
  await page.mouse.click(cx - 150, cy - 100);
  await page.keyboard.press('Escape');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save plan image' }).click();
  const file = await (await download).path();
  const dataUrl = `data:image/png;base64,${readFileSync(file).toString('base64')}`;

  // The widest run of fully transparent pixels from each edge inwards.
  const margins = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const opaque = (x: number, y: number) =>
      data[(y * c.width + x) * 4 + 3] > 0;
    const rowEmpty = (y: number) => {
      for (let x = 0; x < c.width; x++) if (opaque(x, y)) return false;
      return true;
    };
    const colEmpty = (x: number) => {
      for (let y = 0; y < c.height; y++) if (opaque(x, y)) return false;
      return true;
    };
    let top = 0;
    while (top < c.height && rowEmpty(top)) top++;
    let bottom = 0;
    while (bottom < c.height && rowEmpty(c.height - 1 - bottom)) bottom++;
    let left = 0;
    while (left < c.width && colEmpty(left)) left++;
    let right = 0;
    while (right < c.width && colEmpty(c.width - 1 - right)) right++;
    return { top, bottom, left, right, width: c.width, height: c.height };
  }, dataUrl);

  expect(margins.width).toBeGreaterThan(100);
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    expect(margins[side], side).toBeGreaterThanOrEqual(20);
    expect(margins[side], side).toBeLessThan(margins.width / 2);
  }
});
