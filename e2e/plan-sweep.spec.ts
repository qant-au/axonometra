import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Defects found by a UI sweep of the production container on 2026-09-30,
// driven with the mouse and keys as a person would.

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getPlan: () => {
    getFurniture: () => Map<
      number,
      { x: number; y: number; width: number; height: number }
    >;
  };
  getSelection: () => { refs: { kind: string; id: number }[] };
};

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

async function addMenu(page: Page, item: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: item }).click();
}

async function canvasCentre(page: Page) {
  const box = (await page
    .getByRole('application', { name: 'Floor plan' })
    .boundingBox())!;
  return { box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
}

// A 300 x 200 px room round the middle of the view.
async function drawRoom(page: Page) {
  await addMenu(page, 'Draw wall');
  const { cx, cy } = await canvasCentre(page);
  const x0 = cx - 150;
  const y0 = cy - 100;
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
  return { cx, cy };
}

async function addSofa(page: Page) {
  await addMenu(page, 'Add furniture');
  await page.getByRole('dialog').getByAltText('Sofa, 3-seat').click();
  await page.keyboard.press('Escape');
}

const selection = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __axo: Axo }).__axo
      .getSelection()
      .refs.map((r) => r.kind)
  );

test("an item under a room's area label can be clicked and right-clicked", async ({
  page
}) => {
  await start(page);
  const { cx, cy } = await drawRoom(page);
  // New furniture lands in the middle of the view: the room's middle, where
  // its area is written.
  await addSofa(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.mouse.click(cx, cy);
  expect(await selection(page)).toEqual(['furniture']);
  await page.mouse.click(cx, cy, { button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Turn' })).toBeVisible();
});

// Every wall point and item, in screen pixels.
const onScreen = (page: Page) =>
  page.evaluate(() => {
    const a = (window as unknown as { __axo: Axo }).__axo;
    const main = a.getMain() as unknown as {
      toScreen: (x: number, y: number) => { x: number; y: number };
    };
    const plan = a.getPlan() as unknown as {
      getWallNodeSeq: () => {
        getWallNodes: () => Map<number, { x: number; y: number }>;
      };
      getFurniture: () => Map<
        number,
        {
          getBounds: () => {
            minX: number;
            minY: number;
            maxX: number;
            maxY: number;
          };
        }
      >;
    };
    const points: { x: number; y: number }[] = [];
    for (const n of plan.getWallNodeSeq().getWallNodes().values())
      points.push(main.toScreen(n.x, n.y));
    // getBounds is already in screen pixels.
    for (const f of plan.getFurniture().values()) {
      const b = f.getBounds();
      points.push({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY });
    }
    return points;
  });

async function loadFixture(page: Page, name: string) {
  await page.goto('/');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /load from disk/i }).click()
  ]);
  await chooser.setFiles(`e2e/fixtures/${name}`);
  test.skip(
    !(await hasAxo(page)),
    'window.__axo is only present in DEV builds'
  );
}

// Clear of the tool bar (70 px) and inside the canvas.
async function expectAllInView(page: Page) {
  const { box } = await canvasCentre(page);
  await expect
    .poll(async () =>
      (await onScreen(page)).filter(
        (p) =>
          p.x < box.x + 70 ||
          p.x > box.x + box.width ||
          p.y < box.y ||
          p.y > box.y + box.height
      )
    )
    .toEqual([]);
}

for (const name of ['comms-room.scene.json', 'row-of-32-items.scene.json']) {
  test(`a loaded scene opens framed, and Fit everything frames it (${name})`, async ({
    page
  }) => {
    await loadFixture(page, name);
    expect((await onScreen(page)).length).toBeGreaterThan(3);
    await expectAllInView(page);

    // Pan well away, then Shift+1 brings it all back.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    const { cx, cy } = await canvasCentre(page);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 400, cy + 300, { steps: 8 });
    await page.mouse.up();
    await page.getByRole('application', { name: 'Floor plan' }).focus();
    await page.keyboard.press('Shift+1');
    await expectAllInView(page);
  });
}

// Re-sweep 2026-09-30: the area label sat under the item in the middle of a
// loaded room, hidden. It moves to a clear spot in the room instead.
test('a loaded room shows its area clear of the items in it', async ({
  page
}) => {
  await loadFixture(page, 'comms-room.scene.json');
  const read = () =>
    page.evaluate(() => {
      type B = { minX: number; minY: number; maxX: number; maxY: number };
      const floor = (
        window as unknown as {
          __axo: {
            getPlan: () => {
              getCurrentFloor: () => {
                wallNodeSequence: {
                  roomLabels: {
                    children: { text: string; getBounds: () => B }[];
                  };
                };
                getFurniture: () => Map<
                  number,
                  { parent: unknown; getBounds: () => B }
                >;
              };
            };
          };
        }
      ).__axo
        .getPlan()
        .getCurrentFloor();
      const items = [...floor.getFurniture().values()].map((f) =>
        f.getBounds()
      );
      return floor.wallNodeSequence.roomLabels.children.map((t) => {
        const b = t.getBounds();
        return {
          text: t.text,
          covered: items.some(
            (i) =>
              b.minX < i.maxX &&
              i.minX < b.maxX &&
              b.minY < i.maxY &&
              i.minY < b.maxY
          )
        };
      });
    });
  await expect.poll(read).toEqual([{ text: '12 m²', covered: false }]);
});

// Re-sweep 2026-09-30: a measurement's line and length drew under the room
// area label, which could overprint it.
test('a measurement draws over the room areas', async ({ page }) => {
  await start(page);
  const { cx, cy } = await drawRoom(page);
  await page.getByRole('button', { name: 'Measure tool' }).click();
  await page.mouse.move(cx - 100, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy, { steps: 6 });
  const order = await page.evaluate(() => {
    const main = (
      window as unknown as {
        __axo: {
          getMain: () => {
            children: unknown[];
            preview: { preview: unknown };
            floorPlan: unknown;
          };
        };
      }
    ).__axo.getMain();
    return {
      measure: main.children.indexOf(main.preview.preview),
      plan: main.children.indexOf(main.floorPlan)
    };
  });
  await page.mouse.up();
  expect(order.plan).toBeGreaterThanOrEqual(0);
  expect(order.measure).toBeGreaterThan(order.plan);
});

const planState = (page: Page) =>
  page.evaluate(() => {
    const plan = (
      window as unknown as { __axo: Axo }
    ).__axo.getPlan() as unknown as {
      getWallNodeSeq: () => {
        getWallNodes: () => Map<number, { x: number; y: number }>;
      };
      getFurniture: () => Map<number, { x: number; y: number }>;
    };
    const sort = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1];
    return {
      nodes: [...plan.getWallNodeSeq().getWallNodes().values()]
        .map((n) => [n.x, n.y])
        .sort(sort),
      furniture: [...plan.getFurniture().values()]
        .map((f) => [Math.round(f.x), Math.round(f.y)])
        .sort(sort)
    };
  });

test('paste steps each copy off the last; a cut pastes back where it was', async ({
  page
}) => {
  await start(page);
  const { cx, cy } = await drawRoom(page);
  await addSofa(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.mouse.click(cx, cy);
  expect(await selection(page)).toEqual(['furniture']);
  const [[x, y]] = (await planState(page)).furniture;

  // The pointer stays on the sofa, where a person copied it from.
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await page.keyboard.press('ControlOrMeta+v');
  // Half a metre (50 px) down and right each time.
  expect((await planState(page)).furniture).toEqual([
    [x, y],
    [x + 50, y + 50],
    [x + 100, y + 100]
  ]);

  const before = await planState(page);
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+x');
  expect((await planState(page)).nodes).toEqual([]);
  await page.keyboard.press('ControlOrMeta+v');
  expect(await planState(page)).toEqual(before);
});

test('the wall drawing hint goes when Escape ends the chain', async ({
  page
}) => {
  await start(page);
  await addMenu(page, 'Draw wall');
  await expect(page.getByText(/Wall drawing mode/)).toBeVisible();
  await page.keyboard.press('Escape');
  const { cx, cy } = await canvasCentre(page);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(300);
  await page.mouse.click(cx + 200, cy);
  await page.keyboard.press('Escape');
  await expect(page.getByText(/Wall drawing mode/)).toHaveCount(0);
});

// Re-sweep 2026-09-30: a chain ended by a double click left the hint up.
test('the wall drawing hint goes when a double click ends the chain', async ({
  page
}) => {
  // The sweep's window and steps.
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page);
  await page.getByRole('button', { name: /close/i }).last().click();
  await addMenu(page, 'Draw wall');
  await page.keyboard.press('Escape');
  await addMenu(page, 'Draw wall');
  await expect(page.getByText(/Wall drawing mode/)).toBeVisible();
  const { cx, cy } = await canvasCentre(page);
  await page.mouse.click(cx - 150, cy + 100);
  await page.waitForTimeout(300);
  await page.mouse.dblclick(cx + 150, cy + 100);
  // The hint hides itself after 4 s; it must go well before that.
  await expect(page.getByText(/Wall drawing mode/)).toHaveCount(0, {
    timeout: 1000
  });
  // The chain is over: the next click starts a new one, drawing no wall.
  const walls = await page.evaluate(
    () =>
      (
        window as unknown as {
          __axo: {
            getPlan: () => {
              getWallNodeSeq: () => { getWalls: () => unknown[] };
            };
          };
        }
      ).__axo
        .getPlan()
        .getWallNodeSeq()
        .getWalls().length
  );
  expect(walls).toBe(1);
});

test('a newly placed item moves with a press and drag anywhere on it', async ({
  page
}) => {
  await start(page);
  await addSofa(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const { cx, cy } = await canvasCentre(page);
  const [[x, y]] = (await planState(page)).furniture;
  // Off its centre, where the move handle is: on the seat, not a handle.
  await page.mouse.move(cx - 60, cy + 10);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy + 70, { steps: 10 });
  await page.mouse.up();
  // By the drag, to the 10 cm grid it snaps to.
  const after = (await planState(page)).furniture;
  expect(Math.abs(after[0][0] - (x + 100))).toBeLessThanOrEqual(10);
  expect(Math.abs(after[0][1] - (y + 60))).toBeLessThanOrEqual(10);
  // And the drag is over: moving the mouse again leaves it where it is.
  await page.mouse.move(cx + 200, cy + 200, { steps: 5 });
  expect((await planState(page)).furniture).toEqual(after);
});
