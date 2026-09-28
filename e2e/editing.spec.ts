import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Pointer editing, driven with the mouse as a person would. Each test pins a
// defect found by a UI sweep of the production container on 2026-09-28.

type Node = { x: number; y: number };
type Axo = {
  getMain: () => {
    bkgPattern?: unknown;
    x: number;
    y: number;
    scale: { x: number };
    center: { x: number; y: number };
  };
  getPlan: () => {
    getWallNodeSeq: () => {
      getWallNodes: () => Map<number, Node>;
      getWalls: () => unknown[];
    };
    getFurniture: () => Map<
      number,
      { x: number; y: number; width: number; height: number }
    >;
  };
};

const axo = (page: Page) =>
  page.evaluate(() => {
    const a = (window as unknown as { __axo: Axo }).__axo;
    const seq = a.getPlan().getWallNodeSeq();
    const m = a.getMain();
    return {
      nodes: [...seq.getWallNodes().values()].map((n) => [n.x, n.y]),
      walls: seq.getWalls().length,
      main: {
        x: m.x,
        y: m.y,
        scale: m.scale.x,
        cx: m.center.x,
        cy: m.center.y
      },
      furniture: [...a.getPlan().getFurniture().values()].map((f) => [
        f.x + f.width / 2,
        f.y + f.height / 2
      ])
    };
  });

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  test.skip(
    !(await hasAxo(page)),
    'window.__axo is only present in DEV builds'
  );
  await page.waitForFunction(
    () => !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern
  );
}

// Draw one wall from (x0, y) to (x1, y) with the Draw wall tool.
async function drawWall(page: Page, x0: number, x1: number, y: number) {
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  await page.mouse.move(650, 750);
  await page.mouse.click(x0, y);
  await page.mouse.click(x1, y);
  await page.keyboard.press('Escape');
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 12 });
  await page.mouse.up();
}

test('a wall point follows the mouse in Edit mode', async ({ page }) => {
  await start(page);
  await drawWall(page, 500, 800, 400);
  const before = await axo(page);
  await page.getByRole('button', { name: 'Edit' }).click();
  // The cursor graphic sits under the mouse; it used to take the press.
  await drag(page, [800, 400], [850, 500]);
  const after = await axo(page);
  expect(after.nodes[0]).toEqual(before.nodes[0]);
  expect(after.nodes[1]).toEqual([
    before.nodes[1][0] + 50,
    before.nodes[1][1] + 100
  ]);
});

test('a dragged wall moves by the mouse distance at any zoom', async ({
  page
}) => {
  await start(page);
  await drawWall(page, 500, 800, 400);
  // Zoom in around the wall, then read where it is on screen.
  await page.evaluate(() =>
    (
      window as unknown as {
        __axo: { getMain: () => { setZoom: (z: number, c: boolean) => void } };
      }
    ).__axo
      .getMain()
      .setZoom(1.6, true)
  );
  const before = await axo(page);
  expect(before.main.scale).toBeGreaterThan(1.2);
  const screen = (n: number[]) => [
    n[0] * before.main.scale + before.main.x,
    n[1] * before.main.scale + before.main.y
  ];
  const [ax, ay] = screen(before.nodes[0]);
  const [bx] = screen(before.nodes[1]);
  const mid: [number, number] = [(ax + bx) / 2, ay];
  await page.getByRole('button', { name: 'Edit' }).click();
  await drag(page, mid, [mid[0], mid[1] + 60]);
  const after = await axo(page);
  // 60 screen px at this zoom is 60 / scale plan units, give or take the grid.
  const moved = after.nodes[0][1] - before.nodes[0][1];
  expect(Math.abs(moved - 60 / before.main.scale)).toBeLessThanOrEqual(10);
  expect(after.nodes[1][1] - before.nodes[1][1]).toBe(moved);
});

test('new furniture appears in the middle of the view', async ({ page }) => {
  await start(page);
  // Pan away first, so the old fixed spot and the view centre differ.
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await drag(page, [700, 400], [400, 250]);
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  await page.getByRole('dialog').getByAltText('Sofa, 3-seat').click();
  const s = await axo(page);
  expect(s.furniture[0][0]).toBeCloseTo(s.main.cx, 0);
  expect(s.furniture[0][1]).toBeCloseTo(s.main.cy, 0);
});

test('a left drag pans in View mode', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  const before = await axo(page);
  await drag(page, [700, 400], [500, 300]);
  const after = await axo(page);
  expect(after.main.x - before.main.x).toBeCloseTo(-200, -1);
  expect(after.main.y - before.main.y).toBeCloseTo(-100, -1);
});

test('pan and zoom still work after drawing walls', async ({ page }) => {
  await start(page);
  // Drawing pauses pan and zoom; this sequence used to leave them paused.
  await drawWall(page, 500, 800, 400);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  const before = await axo(page);
  await drag(page, [700, 300], [500, 200]);
  const panned = await axo(page);
  expect(panned.main.x - before.main.x).toBeCloseTo(-200, -1);
  await page.mouse.move(650, 400);
  await page.mouse.wheel(0, -400);
  await expect
    .poll(async () => (await axo(page)).main.scale)
    .toBeGreaterThan(1.1);
});

test('right-clicking a wall while drawing does not split it', async ({
  page
}) => {
  await start(page);
  await drawWall(page, 500, 800, 400);
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  await page.mouse.click(650, 400, { button: 'right' });
  const s = await axo(page);
  expect(s.walls).toBe(1);
  expect(s.nodes).toHaveLength(2);
});

test('the help panel has a named close button and closes on Escape', async ({
  page
}) => {
  await start(page);
  const help = page.locator('.mantine-Dialog-root');
  const close = help.getByRole('button', { name: 'Close' });
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(close).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(close).toBeHidden();
  await page.getByRole('button', { name: 'Help' }).click();
  await close.click();
  await expect(close).toBeHidden();
});
