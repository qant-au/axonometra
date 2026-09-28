import { test, expect } from '@playwright/test';
import { hasAxo } from './axo';

// The 3D view: draw two walls, open it, check what it says it shows, flip its
// options, and save a PNG. Uses the DEV-only window.__axo handle like
// undo-redo.spec.ts (Tool.WallAdd = 0).

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
};

test('open the 3D view of a drawn plan and save an image', async ({
  page
}, testInfo) => {
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
  await page.mouse.click(cx, cy);
  await page.mouse.click(cx + 200, cy);
  await page.mouse.click(cx + 200, cy + 200);

  await page.getByRole('button', { name: '3D view' }).click();
  const view = page.getByRole('img', { name: /^3D view of floor 0/ });
  await expect(view).toHaveAttribute('aria-label', /2 walls/, {
    timeout: 10000
  });
  await expect(view).toHaveAttribute('aria-label', /walls cut away/);

  await page.getByRole('switch', { name: 'Cut away walls' }).click();
  await expect(view).not.toHaveAttribute('aria-label', /walls cut away/);
  await page.getByRole('button', { name: 'Turn left' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^axonometra-3d-.*\.png$/);
  const path = testInfo.outputPath('3d.png');
  await file.saveAs(path);
  const { statSync } = await import('node:fs');
  expect(statSync(path).size).toBeGreaterThan(5000);

  const model = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save 3D model' }).click();
  const glb = await model;
  expect(glb.suggestedFilename()).toMatch(/^axonometra-3d-.*\.glb$/);
  const glbPath = testInfo.outputPath('3d.glb');
  await glb.saveAs(glbPath);
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(glbPath).subarray(0, 4).toString()).toBe('glTF');
});
