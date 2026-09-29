import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Typing a wall's length (upstream arcada issue #13): double-click a wall in
// Edit mode, enter metres, and the wall resizes about its midpoint as one
// undo step. Uses the DEV-only window.__axo handle like undo-redo.spec.ts
// (Tool.WallAdd = 0, Tool.Edit = 1).

type Wall = {
  length: number;
  leftNode: { x: number; y: number };
  rightNode: { x: number; y: number };
};
type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
  getPlan: () => { getWallNodeSeq: () => { getWalls: () => Wall[] } };
};

async function wall(page: Page) {
  return page.evaluate(() => {
    const w = (window as unknown as { __axo: Axo }).__axo
      .getPlan()
      .getWallNodeSeq()
      .getWalls()[0];
    return {
      length: w.length,
      mid: {
        x: (w.leftNode.x + w.rightNode.x) / 2,
        y: (w.leftNode.y + w.rightNode.y) / 2
      }
    };
  });
}

const setTool = (page: Page, tool: number) =>
  page.evaluate(
    (t) => (window as unknown as { __axo: Axo }).__axo.getStore().setTool(t),
    tool
  );

test('double-clicking a wall in Edit mode sets its length', async ({
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

  await setTool(page, 0);
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  await page.mouse.click(cx + 200, cy);
  const before = await wall(page);

  await setTool(page, 1);
  // Clicks within 200 ms are counted together: straight after the click that
  // ended the wall, this double-click would count as a triple click.
  await page.waitForTimeout(300);
  await page.mouse.dblclick(cx + 100, cy);
  const input = page.getByLabel('Length (mm)');
  await expect(input).toBeFocused();
  // Any metric unit may be typed; a bare number is in the display units.
  await input.fill('3 m');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(input).toHaveCount(0);

  const after = await wall(page);
  // The label reads the drawn length less one 0.2 m wall thickness.
  expect(after.length).toBeCloseTo(320, 5);
  expect(after.mid.x).toBeCloseTo(before.mid.x, 5);
  expect(after.mid.y).toBeCloseTo(before.mid.y, 5);

  // One undo step restores the original wall.
  await page.keyboard.press('ControlOrMeta+z');
  expect((await wall(page)).length).toBeCloseTo(before.length, 5);

  // Keyboard: the cursor starts at the view centre, on the wall's first point.
  await page.getByRole('application', { name: 'Floor plan' }).focus();
  await page.keyboard.press('l');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
  expect((await wall(page)).length).toBeCloseTo(before.length, 5);
});
