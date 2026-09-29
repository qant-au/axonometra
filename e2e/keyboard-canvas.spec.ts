import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Keyboard-only editing on the canvas (KeyboardCursor): draw a wall, pick a
// point up and move it, cancel a move, undo, and delete, without the mouse.
// Tool selection goes through the DEV-only window.__axo handle like the other
// specs (Tool.WallAdd = 0, Edit = 1, Remove = 2).

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
  getPlan: () => {
    getWallNodeSeq: () => {
      getWallNodes: () => Map<number, { x: number; y: number }>;
      getWalls: () => unknown[];
    };
  };
};

async function setTool(page: Page, tool: number) {
  await page.evaluate(
    (t) => (window as unknown as { __axo: Axo }).__axo.getStore().setTool(t),
    tool
  );
}

async function plan(page: Page) {
  return page.evaluate(() => {
    const seq = (window as unknown as { __axo: Axo }).__axo
      .getPlan()
      .getWallNodeSeq();
    return {
      nodes: [...seq.getWallNodes().values()].map((n) => [n.x, n.y]),
      walls: seq.getWalls().length
    };
  });
}

async function press(page: Page, key: string, times = 1) {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

test.describe('keyboard canvas', () => {
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
  });

  test('draw, move, cancel, undo and delete with the keyboard', async ({
    page
  }) => {
    const canvas = page.getByRole('application', { name: 'Floor plan' });
    const live = page.locator('[aria-live="polite"]');

    await setTool(page, 0);
    // Only keyboard focus brings up the cursor (a mouse press into the plan
    // must not), so reach the canvas with Tab, as a keyboard user does.
    for (let i = 0; i < 40; i++) {
      if (await canvas.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(live).toContainText('Cursor at');

    // Two points 2 m apart make one wall; Escape ends the chain.
    await press(page, 'Enter');
    await expect(live).toContainText('Wall started');
    await press(page, 'Shift+ArrowRight', 2);
    await press(page, 'Enter');
    await expect(live).toContainText('Wall added');
    await press(page, 'Escape');
    let state = await plan(page);
    expect(state.walls).toBe(1);
    expect(state.nodes).toHaveLength(2);
    const [start, end] = state.nodes;
    expect(end[0] - start[0]).toBe(200);

    // Pick up the end point, move it 1 m down, put it down.
    await setTool(page, 1);
    await press(page, 'Enter');
    await expect(live).toContainText('Picked up wall point');
    await press(page, 'Shift+ArrowDown');
    await press(page, 'Enter');
    await expect(live).toContainText('Put down wall point');
    state = await plan(page);
    expect(state.nodes[1]).toEqual([end[0], end[1] + 100]);

    // A cancelled move leaves the point where it was.
    await press(page, 'Enter');
    await press(page, 'ArrowLeft', 5);
    await press(page, 'Escape');
    await expect(live).toContainText('Move cancelled');
    expect((await plan(page)).nodes[1]).toEqual([end[0], end[1] + 100]);

    // The move was one undo step.
    await page.keyboard.press('ControlOrMeta+z');
    expect((await plan(page)).nodes[1]).toEqual(end);

    // The cursor followed the cancelled move back; return it to the point
    // (now undone to its original spot). A point with a wall attached is
    // refused, so delete the wall from its middle first, then the point.
    await press(page, 'Shift+ArrowUp');
    await setTool(page, 2);
    await press(page, 'Enter');
    await expect(live).toContainText('still has walls attached');
    expect((await plan(page)).nodes).toHaveLength(2);
    await press(page, 'Shift+ArrowLeft');
    await press(page, 'Enter');
    await expect(live).toContainText('Wall deleted');
    await press(page, 'Shift+ArrowRight');
    await press(page, 'Enter');
    await expect(live).toContainText('Wall point deleted');
    state = await plan(page);
    expect(state.nodes).toEqual([start]);
    expect(state.walls).toBe(0);
  });

  test('arrow keys on the focused canvas do not scroll the page', async ({
    page
  }) => {
    await page.getByRole('application', { name: 'Floor plan' }).focus();
    const before = await page.evaluate(() => window.scrollY);
    await press(page, 'ArrowDown', 5);
    await press(page, ' ');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });
});
