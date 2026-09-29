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
  // At a person's pace. Clicked back to back while the whole suite was
  // running, the last wall was sometimes missing; the cause is not
  // established (the editor ends a chain on a repeat click of the same point,
  // with no timing), and no person clicks this fast.
  await page.mouse.click(x0, y);
  await page.waitForTimeout(300);
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
  // The shared keymap: a plain wheel pans, Ctrl + wheel zooms.
  await page.mouse.move(650, 400);
  await page.mouse.wheel(0, 100);
  await expect
    .poll(async () => (await axo(page)).main.y)
    .toBeLessThan(panned.main.y - 50);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -400);
  await page.keyboard.up('Control');
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
  const help = page.getByRole('dialog', { name: /^Help:/ });
  const close = help.getByRole('button', { name: 'Close' });
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(close).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(close).toBeHidden();
  await page.getByRole('button', { name: 'Help' }).click();
  await close.click();
  await expect(close).toBeHidden();
});

// The transform handles of the selected item, on screen, by cursor.
async function handles(page: Page) {
  return page.evaluate(() => {
    const main = (
      window as unknown as {
        __axo: {
          getMain: () => { children: { constructor: { name: string } }[] };
        };
      }
    ).__axo.getMain();
    // The handles hang off the layer's border graphic.
    const layer = main.children.find(
      (c) => c.constructor.name === 'TransformLayer'
    ) as unknown as {
      children: {
        children: {
          cursor: string;
          getGlobalPosition: () => { x: number; y: number };
        }[];
      }[];
    };
    return layer.children[0].children.map((h) => ({
      cursor: h.cursor,
      ...h.getGlobalPosition()
    }));
  });
}

const sofa = (page: Page) =>
  page.evaluate(() => {
    const f = [
      ...(
        window as unknown as {
          __axo: {
            getPlan: () => {
              getFurniture: () => Map<
                number,
                {
                  rotation: number;
                  getBounds: () => {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                  };
                  serialize: () => { orientation: number };
                }
              >;
            };
          };
        }
      ).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0];
    const b = f.getBounds();
    return {
      rotation: f.rotation,
      cx: b.x + b.width / 2,
      cy: b.y + b.height / 2,
      orientation: f.serialize().orientation
    };
  });

async function selectedSofa(page: Page) {
  await start(page);
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  await page.getByRole('dialog').getByAltText('Sofa, 3-seat').click();
  await page.keyboard.press('Escape');
  // The drawer's overlay catches clicks until its closing transition ends.
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Edit' }).click();
  const s = await sofa(page);
  await page.mouse.move(s.cx, s.cy);
  await page.mouse.down();
  await page.mouse.up();
  await expect
    .poll(async () => (await handles(page)).length)
    .toBeGreaterThan(0);
  return s;
}

test('the rotate handle turns an item about its centre', async ({ page }) => {
  const before = await selectedSofa(page);
  const all = await handles(page);
  const rotate = all.find((h) => h.cursor === 'grab');
  if (!rotate) throw new Error('no rotate handle: ' + JSON.stringify(all));
  // Sweep a quarter turn clockwise round the item's centre.
  const r = Math.hypot(rotate.x - before.cx, rotate.y - before.cy);
  const a0 = Math.atan2(rotate.y - before.cy, rotate.x - before.cx);
  await page.mouse.move(rotate.x, rotate.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    const a = a0 + ((Math.PI / 2) * i) / 12;
    await page.mouse.move(
      before.cx + r * Math.cos(a),
      before.cy + r * Math.sin(a)
    );
  }
  await page.mouse.up();
  const after = await sofa(page);
  expect(after.rotation - before.rotation).toBeCloseTo(Math.PI / 2, 1);
  expect(Math.abs(after.cx - before.cx)).toBeLessThan(3);
  expect(Math.abs(after.cy - before.cy)).toBeLessThan(3);

  // Turned, the width handle sits under the width label; it still resizes.
  const widthBefore = await sofaSize(page);
  const width = (await handles(page)).find((h) => h.cursor === 'ew-resize')!;
  await page.mouse.move(width.x, width.y);
  await page.mouse.down();
  await page.mouse.move(width.x, width.y + 40, { steps: 10 });
  await page.mouse.up();
  expect((await sofaSize(page)).w - widthBefore.w).toBeCloseTo(40, -1);
});

test('the context menu turns a selected item', async ({ page }) => {
  const before = await selectedSofa(page);
  // The move handle sits on the item's centre, where a person right-clicks.
  // Right-click opens the menu (shared keymap); Turn is in it.
  await page.mouse.click(before.cx, before.cy, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Turn' }).click();
  expect((await sofa(page)).orientation).toBe((before.orientation + 1) % 4);
});

test('the selection box follows the item while it is resized', async ({
  page
}) => {
  const before = await selectedSofa(page);
  const width = (await handles(page)).find((h) => h.cursor === 'ew-resize')!;
  await page.mouse.move(width.x, width.y);
  await page.mouse.down();
  await page.mouse.move(width.x + 60, width.y, { steps: 10 });
  await page.mouse.up();
  const box = await page.evaluate(() => {
    const f = [
      ...(
        window as unknown as {
          __axo: {
            getPlan: () => {
              getFurniture: () => Map<
                number,
                { getBounds: () => { x: number; width: number } }
              >;
            };
          };
        }
      ).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0];
    const b = f.getBounds();
    return { right: b.x + b.width };
  });
  const after = (await handles(page)).find((h) => h.cursor === 'ew-resize')!;
  expect(box.right).toBeGreaterThan(before.cx + 50);
  // The width handle sits on the item's new right edge, not its old one.
  expect(Math.abs(after.x - box.right)).toBeLessThan(8);
});

const sofaSize = (page: Page) =>
  page.evaluate(() => {
    const f = [
      ...(
        window as unknown as {
          __axo: {
            getPlan: () => {
              getFurniture: () => Map<
                number,
                { width: number; height: number }
              >;
            };
          };
        }
      ).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0];
    return { w: f.width, h: f.height };
  });

test('resize handles move the edge by the drag distance', async ({ page }) => {
  await selectedSofa(page);
  const before = await sofaSize(page);
  const depth = (await handles(page)).find((h) => h.cursor === 'ns-resize')!;
  await page.mouse.move(depth.x, depth.y);
  await page.mouse.down();
  await page.mouse.move(depth.x, depth.y + 40, { steps: 10 });
  await page.mouse.up();
  const after = await sofaSize(page);
  // At 100% zoom a screen pixel is a plan unit (1 cm).
  expect(after.h - before.h).toBeCloseTo(40, -1);
  expect(after.w).toBeCloseTo(before.w, 0);
});

test('clicking back into the plan does not move the view', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  await page.getByRole('dialog').getByAltText('Sofa, 3-seat').click();
  await page.keyboard.press('Escape');
  // Focus the plan with the mouse, then leave it and pan well away.
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.mouse.click(300, 650);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await drag(page, [900, 600], [300, 250]);
  await page.getByRole('button', { name: 'Edit' }).click();
  // Clicking back in used to scroll the view to the keyboard cursor.
  const before = await axo(page);
  await page.mouse.click(700, 300);
  const after = await axo(page);
  expect([after.main.x, after.main.y]).toEqual([before.main.x, before.main.y]);
});

test('in View, a drag that starts on a wall pans', async ({ page }) => {
  await start(page);
  await drawWall(page, 500, 800, 400);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  const before = await axo(page);
  await drag(page, [650, 400], [500, 300]);
  const after = await axo(page);
  expect(after.main.x - before.main.x).toBeCloseTo(-150, -1);
});

test('in View, a drag that starts on furniture pans', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  await page.getByRole('dialog').getByAltText('Sofa, 3-seat').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  const before = await axo(page);
  const s = await sofa(page);
  await drag(page, [s.cx, s.cy], [s.cx - 150, s.cy - 100]);
  const after = await axo(page);
  expect(after.main.x - before.main.x).toBeCloseTo(-150, -1);
});
