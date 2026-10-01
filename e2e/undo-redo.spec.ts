import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Undo/redo e2e: each canvas click in the Wall tool is one undo step, walked
// back and forward with the keyboard and the toolbar. Uses the DEV-only
// window.__axo handle like place-wall.spec.ts (Tool.WallAdd = 0).

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
  getPlan: () => {
    getWallNodeSeq: () => {
      getWallNodes: () => Map<number, unknown>;
      getWalls: () => unknown[];
    };
  };
};

async function counts(page: Page) {
  return page.evaluate(() => {
    const seq = (window as unknown as { __axo: Axo }).__axo
      .getPlan()
      .getWallNodeSeq();
    return { nodes: seq.getWallNodes().size, walls: seq.getWalls().length };
  });
}

test.describe('undo / redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new plan/i }).click();
    await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(
      0,
      { timeout: 3000 }
    );
    test.skip(
      !(await hasAxo(page)),
      'window.__axo is only present in DEV builds'
    );
    await page.waitForFunction(
      () =>
        !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern,
      undefined,
      { timeout: 5000 }
    );
    await page.evaluate(() =>
      (window as unknown as { __axo: Axo }).__axo.getStore().setTool(0)
    );
  });

  test('each wall click is one step, undone and redone in order', async ({
    page
  }) => {
    const undoButton = page.getByRole('button', { name: 'Undo' });
    const redoButton = page.getByRole('button', { name: 'Redo' });
    await expect(undoButton).toBeDisabled();
    await expect(redoButton).toBeDisabled();

    const box = await page.locator('canvas').first().boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 200, cy);
    await page.mouse.click(cx + 200, cy + 200);
    expect(await counts(page)).toEqual({ nodes: 3, walls: 2 });
    await expect(undoButton).toBeEnabled();

    await page.keyboard.press('ControlOrMeta+z');
    expect(await counts(page)).toEqual({ nodes: 2, walls: 1 });
    await expect(redoButton).toBeEnabled();

    await undoButton.click();
    expect(await counts(page)).toEqual({ nodes: 1, walls: 0 });

    await page.keyboard.press('ControlOrMeta+Shift+z');
    expect(await counts(page)).toEqual({ nodes: 2, walls: 1 });

    await redoButton.click();
    expect(await counts(page)).toEqual({ nodes: 3, walls: 2 });
    await expect(redoButton).toBeDisabled();

    // Ctrl+Y is the shared keymap's second redo chord (Ctrl alone, every OS).
    await page.keyboard.press('ControlOrMeta+z');
    expect(await counts(page)).toEqual({ nodes: 2, walls: 1 });
    await page.keyboard.press('Control+y');
    expect(await counts(page)).toEqual({ nodes: 3, walls: 2 });
  });

  test('a new edit after undo discards the redo branch', async ({ page }) => {
    const box = await page.locator('canvas').first().boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 200, cy);
    // Finish the wall chain so the next click starts a new one.
    await page.keyboard.press('ControlOrMeta+z');
    expect(await counts(page)).toEqual({ nodes: 1, walls: 0 });

    await page.mouse.click(cx, cy + 200);
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  test('loading a plan starts a fresh history', async ({ page }) => {
    const box = await page.locator('canvas').first().boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();

    const plan = JSON.stringify({
      version: 1,
      floors: [],
      furnitureId: 0,
      wallNodeId: 0
    });
    await page
      .locator('input[type=file]')
      .last()
      .setInputFiles({
        name: 'plan.json',
        mimeType: 'application/json',
        buffer: Buffer.from(plan)
      });
    await expect.poll(async () => (await counts(page)).nodes).toBe(0);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});
