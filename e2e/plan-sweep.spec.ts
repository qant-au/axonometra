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

// Re-sweep 2 2026-09-30: fitted to the 32-item row, the view is zoomed so far
// out that the grid's 10 cm lines ran together into dense bands. There the
// metre lines alone are drawn; zoomed back in, the full grid returns.
test('zoomed far out, the grid draws its metre lines only', async ({
  page
}) => {
  await loadFixture(page, 'row-of-32-items.scene.json');
  const grid = () =>
    page.evaluate(() => {
      const main = (
        window as unknown as {
          __axo: {
            getMain: () => {
              scale: { x: number };
              bkgPattern?: { visible: boolean };
              lineGrid?: { visible: boolean };
            };
          };
        }
      ).__axo.getMain();
      // Not yet set up: the canvas is still loading.
      if (!main.bkgPattern || !main.lineGrid) return null;
      return {
        coarse: main.scale.x < 0.5,
        pattern: main.bkgPattern.visible,
        metres: main.lineGrid.visible
      };
    });
  await expect
    .poll(grid)
    .toEqual({ coarse: true, pattern: false, metres: true });
  await page.getByRole('application', { name: 'Floor plan' }).focus();
  await page.keyboard.press('ControlOrMeta+0');
  await expect
    .poll(grid)
    .toEqual({ coarse: false, pattern: true, metres: false });
});

// Re-sweep 3 2026-09-30: at 0.51x (New plan, zoomed out three times) the
// 10 cm lines drew 5 px apart with uneven 5/11/16 px gaps, the grid pattern's
// texture dropping lines as it was drawn small. At no zoom are grid lines
// under 8 px apart, and the gaps between them differ by a pixel at most.
test('the grid lines are evenly spaced, and never packed, at any zoom', async ({
  page
}) => {
  await start(page);
  // The gaps, in screen pixels, between the vertical grid lines across a
  // strip of the empty plan.
  const gaps = async () => {
    await page.waitForTimeout(300);
    const { box } = await canvasCentre(page);
    const width = 600;
    const height = 40;
    const luma = await lumaIn(page, {
      x: box.x + 200,
      y: box.y + 150,
      width,
      height
    });
    const scale = Math.sqrt(luma.length / (width * height));
    const w = width * scale;
    for (let y = 0; y < height * scale; y++) {
      const row = luma.slice(y * w, (y + 1) * w);
      const paper = Math.max(...row);
      const dark: number[] = [];
      for (let x = 0; x < w; x++) if (row[x] < paper - 12) dark.push(x);
      // A row on a horizontal grid line is dark all along: try the next.
      if (dark.length > w / 3) continue;
      const starts = dark.filter((x, i) => i === 0 || x !== dark[i - 1] + 1);
      return starts.slice(1).map((x, i) => Math.round((x - starts[i]) / scale));
    }
    return [];
  };
  const setZoom = (zoom: number) =>
    page.evaluate((z) => {
      (
        window as unknown as {
          __axo: {
            getMain: () => { setZoom: (z: number, c: boolean) => void };
          };
        }
      ).__axo
        .getMain()
        .setZoom(z, true);
    }, zoom);
  // The zoom-out key steps (1, 0.8, 0.64, 0.512, 0.41) and wheel zooms in
  // between, where the 10 cm lines fall a fraction of a pixel apart.
  for (const zoom of [1, 0.93, 0.87, 0.83, 0.8, 0.79, 0.64, 0.512, 0.41]) {
    await setZoom(zoom);
    const found = await gaps();
    const at = `at ${zoom}x: ${found.join()}`;
    expect(found.length, `lines ${at}`).toBeGreaterThan(1);
    expect(Math.min(...found), `closest ${at}`).toBeGreaterThanOrEqual(8);
    expect(
      Math.max(...found) - Math.min(...found),
      `uneven ${at}`
    ).toBeLessThanOrEqual(1);
  }
});

// Re-sweep 4 2026-09-30: below full size the grid is drawn line by line,
// and those lines were darker than the pattern's at full size (10 cm lines
// 37 levels below the paper against 27), so the grid darkened the moment the
// zoom dropped under 1x. In light and dark mode each kind of line carries
// the same ink on both sides of 1x.
test('the grid is as dark just below full size as at it', async ({ page }) => {
  await start(page);
  // How far the 10 cm and the metre lines are from the paper, summed across
  // each line and per screen pixel, on a row of the empty plan clear of the
  // horizontal lines.
  const ink = async () => {
    await page.waitForTimeout(300);
    const { box } = await canvasCentre(page);
    const width = 400;
    const height = 30;
    const luma = await lumaIn(page, {
      x: box.x + 200,
      y: box.y + 150,
      width,
      height
    });
    const scale = Math.sqrt(luma.length / (width * height));
    const w = width * scale;
    // The paper is the commonest shade, lighter or darker than the lines.
    const counts = new Map<number, number>();
    for (const v of luma) {
      const k = Math.round(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const paper = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    for (let y = 0; y < height * scale; y++) {
      const row = luma
        .slice(y * w, (y + 1) * w)
        .map((v) => Math.abs(v - paper));
      // Most of a row on a horizontal line is off the paper: try the next.
      if (row.filter((d) => d > 2).length > w / 2) continue;
      const sums: number[] = [];
      let sum = 0;
      for (const d of [...row, 0]) {
        if (d > 2) sum += d;
        else if (sum) {
          sums.push(sum / scale);
          sum = 0;
        }
      }
      sums.sort((a, b) => a - b);
      return {
        minor: sums[Math.floor(sums.length / 2)],
        metre: sums[sums.length - 1]
      };
    }
    throw new Error('every row is on a horizontal grid line');
  };
  const setZoom = (zoom: number) =>
    page.evaluate((z) => {
      (
        window as unknown as {
          __axo: {
            getMain: () => { setZoom: (z: number, c: boolean) => void };
          };
        }
      ).__axo
        .getMain()
        .setZoom(z, true);
    }, zoom);
  for (const mode of ['light', 'dark']) {
    if (mode === 'dark') {
      await page.getByRole('application', { name: 'Floor plan' }).focus();
      await page.keyboard.press('Alt+Shift+D');
      await expect
        .poll(() =>
          page.evaluate(() => localStorage.getItem('axonometra-theme'))
        )
        .toBe('dark');
    }
    await setZoom(1);
    const full = await ink();
    for (const zoom of [0.999, 0.93]) {
      await setZoom(zoom);
      const below = await ink();
      const at = `${mode}, 1x ${JSON.stringify(full)}, ${zoom}x ${JSON.stringify(below)}`;
      expect(
        Math.abs(below.minor - full.minor),
        `10 cm, ${at}`
      ).toBeLessThanOrEqual(4);
      expect(
        Math.abs(below.metre - full.metre),
        `metre, ${at}`
      ).toBeLessThanOrEqual(4);
    }
  }
});

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

const areaLabelShown = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as {
        __axo: {
          getPlan: () => {
            getCurrentFloor: () => {
              wallNodeSequence: {
                roomLabels: { children: { visible: boolean }[] };
              };
            };
          };
        };
      }
    ).__axo
      .getPlan()
      .getCurrentFloor()
      .wallNodeSequence.roomLabels.children.map((t) => t.visible)
  );

// Re-sweep 2 2026-09-30: the measurement's white box covered the area label
// but for the tops of its glyphs, which showed above it. The area now hides
// under the measurement and comes back when it ends.
test('a room area hides under a measurement across it', async ({ page }) => {
  await start(page);
  const { cx, cy } = await drawRoom(page);
  await expect.poll(() => areaLabelShown(page)).toEqual([true]);
  await page.getByRole('button', { name: 'Measure tool' }).click();
  await page.mouse.move(cx - 100, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy, { steps: 6 });
  await expect.poll(() => areaLabelShown(page)).toEqual([false]);
  await page.mouse.up();
  await expect.poll(() => areaLabelShown(page)).toEqual([true]);
});

// The luminance of each pixel in a box of the screen, row by row, read from
// a screenshot (a WebGL canvas cannot be read back from the page).
async function lumaIn(
  page: Page,
  clip: { x: number; y: number; width: number; height: number }
) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const out: number[] = [];
    for (let i = 0; i < d.length; i += 4)
      out.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    return out;
  }, png.toString('base64'));
}

// Re-sweep 2 2026-09-30: the ten measurements the sweep started on a wall or
// an item were captured but never pixel-checked. Each must draw its line and,
// at the middle, its length on a white box.
test('a measurement started on a wall or an item draws its line and length', async ({
  page
}) => {
  await start(page);
  const { cx, cy } = await drawRoom(page);
  await addSofa(page);
  await page.getByRole('button', { name: 'Measure tool' }).click();
  const x0 = cx - 150;
  const y0 = cy - 100;
  const starts: [string, number, number][] = [
    ['top wall', x0 + 60, y0],
    ['top wall', x0 + 200, y0],
    ['left wall', x0, y0 + 60],
    ['right wall', x0 + 300, y0 + 140],
    ['bottom wall', x0 + 120, y0 + 200],
    ['sofa', cx, cy],
    ['sofa', cx + 8, cy - 8],
    ['sofa', cx - 8, cy + 8],
    ['sofa', cx + 10, cy + 10],
    ['sofa', cx - 10, cy - 5]
  ];
  const [dx, dy] = [180, 140];
  const box = (x: number, y: number, w: number, h: number) => ({
    x: Math.round(x - w / 2),
    y: Math.round(y - h / 2),
    width: w,
    height: h
  });
  for (const [what, x, y] of starts) {
    // Two points on the line clear of the label, and the label's middle.
    const along = [0.2, 0.85].map((t) => box(x + dx * t, y + dy * t, 7, 7));
    const label = box(x + dx / 2, y + dy / 2, 40, 12);
    await page.mouse.move(x, y);
    const before = await Promise.all(
      [...along, label].map((c) => lumaIn(page, c))
    );
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 12 });
    const during = await Promise.all(
      [...along, label].map((c) => lumaIn(page, c))
    );
    await page.mouse.up();
    const darkened = (i: number) =>
      during[i].filter((v, k) => before[i][k] - v > 60).length;
    expect(darkened(0), `${what}: line near the start`).toBeGreaterThan(2);
    expect(darkened(1), `${what}: line near the end`).toBeGreaterThan(2);
    // The length: black text on a white box over the plan.
    const whiteIn = (px: number[]) => px.filter((v) => v > 250).length;
    const white = whiteIn(during[2]) - whiteIn(before[2]);
    const ink = during[2].filter((v) => v < 90).length;
    expect(white, `${what}: the length's white box`).toBeGreaterThan(100);
    expect(ink, `${what}: the length's text`).toBeGreaterThan(10);
  }
});

// The room area's box and the read-outs' boxes on screen (the selection's
// size labels here), in floor coordinates; and where the area is on screen.
const areaAndSizes = (page: Page) =>
  page.evaluate(() => {
    type Box = { x: number; y: number; width: number; height: number };
    type Text = {
      visible: boolean;
      position: { x: number; y: number };
      width: number;
      height: number;
      getBounds(): { minX: number; minY: number; maxX: number; maxY: number };
    };
    const floor = (
      window as unknown as {
        __axo: {
          getPlan: () => {
            getCurrentFloor: () => {
              wallNodeSequence: { roomLabels: { children: Text[] } };
              readoutBoxes: () => Box[];
            };
          };
        };
      }
    ).__axo
      .getPlan()
      .getCurrentFloor();
    const t = floor.wallNodeSequence.roomLabels.children[0];
    if (!t) return null; // the plan is still loading
    const b = t.getBounds();
    return {
      area: {
        x: t.position.x,
        y: t.position.y,
        width: t.width,
        height: t.height
      },
      visible: t.visible,
      screen: { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 },
      sizes: floor.readoutBoxes()
    };
  });

// Re-sweep 2 2026-09-30: with the moved access point still selected, its
// "400 mm" size labels drew across the room area label.
test('a room area hides under a selected item’s size labels', async ({
  page
}) => {
  await loadFixture(page, 'comms-room.scene.json');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect.poll(async () => (await areaAndSizes(page))?.visible).toBe(true);
  // The access point sits in the middle; its area is written just above it.
  const ap = await page.evaluate(() => {
    const f = (
      window as unknown as {
        __axo: {
          getPlan: () => {
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
        };
      }
    ).__axo
      .getPlan()
      .getFurniture()
      .values()
      .next().value!;
    const b = f.getBounds();
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  });
  const { screen } = (await areaAndSizes(page))!;
  // Drag it onto the area: the area moves below it, where the item's
  // horizontal size label is drawn.
  await page.mouse.move(ap.x, ap.y);
  await page.mouse.down();
  await page.mouse.move(ap.x, screen.y, { steps: 8 });
  await page.mouse.up();
  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) =>
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height;
  await expect
    .poll(async () => {
      const now = (await areaAndSizes(page))!;
      return {
        sizes: now.sizes.length,
        under: now.sizes.some((s) => overlap(s, now.area)),
        visible: now.visible
      };
    })
    .toEqual({ sizes: 2, under: true, visible: false });
  // Deselected, the area shows again.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await areaAndSizes(page))?.visible).toBe(true);
});

// Re-sweep 2026-09-30: a device placed from the network diagram landed in
// the middle of the view, on top of the access point already there.
test('a device from the network diagram is placed clear of the others', async ({
  page
}) => {
  await loadFixture(page, 'crossover.scene.json');
  await addMenu(page, 'Add furniture');
  await page
    .getByTestId('diagram-objects')
    .getByRole('button', { name: 'Core switch' })
    .click();
  await page.keyboard.press('Escape');
  const boxes = await page.evaluate(() =>
    [
      ...(
        window as unknown as {
          __axo: {
            getPlan: () => {
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
          };
        }
      ).__axo
        .getPlan()
        .getFurniture()
        .values()
    ].map((f) => {
      const b = f.getBounds();
      return [b.minX, b.minY, b.maxX, b.maxY];
    })
  );
  expect(boxes).toHaveLength(4);
  const placed = boxes[3];
  const covered = boxes
    .slice(0, 3)
    .filter(
      (b) =>
        placed[0] < b[2] &&
        b[0] < placed[2] &&
        placed[1] < b[3] &&
        b[1] < placed[3]
    );
  expect(covered).toEqual([]);
});

// Re-sweep 2026-09-30: L / 6, D, W and M took their tools, but no toolbar
// button showed it. Measure is pressed; the Add button lights for the tools
// in its menu, as View, Edit and Erase do for theirs.
test('the toolbar shows the tool a key takes', async ({ page }) => {
  await start(page);
  const canvas = page.getByRole('application', { name: 'Floor plan' });
  await canvas.focus();
  const tool = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __axo: { getStore: () => { activeTool: number } };
          }
        ).__axo.getStore().activeTool
    );
  const addBg = () =>
    page
      .getByRole('button', { name: 'Add', exact: true })
      .evaluate((b) => getComputedStyle(b).backgroundColor);
  const idle = await addBg();
  const measure = page.getByRole('button', { name: 'Measure tool' });
  await expect(measure).toHaveAttribute('aria-pressed', 'false');

  await page.keyboard.press('m');
  await expect(measure).toHaveAttribute('aria-pressed', 'true');
  for (const key of ['l', '6', 'd', 'w']) {
    await page.keyboard.press('v');
    await expect.poll(addBg).toBe(idle);
    const before = await tool();
    await page.keyboard.press(key);
    expect(await tool()).not.toBe(before);
    await expect.poll(addBg).not.toBe(idle);
    await expect(measure).toHaveAttribute('aria-pressed', 'false');
  }
});

// Re-sweep 2 2026-09-30: after Esc the Add button stayed lit until another
// tool was clicked, and it never said so to a screen reader.
test('Esc puts the Add menu tool down, and the Add button goes out', async ({
  page
}) => {
  await start(page);
  const add = page.getByRole('button', { name: 'Add', exact: true });
  const addBg = () => add.evaluate((b) => getComputedStyle(b).backgroundColor);
  const idle = await addBg();
  await expect(add).not.toHaveAttribute('aria-current');
  const edit = page.getByRole('button', { name: 'Edit', exact: true });

  for (const item of ['Add window', 'Add door', 'Draw wall']) {
    await addMenu(page, item);
    await expect(add).toHaveAttribute('aria-current', 'true');
    await expect.poll(addBg).not.toBe(idle);
    if (item === 'Draw wall') {
      // Mid-chain: Esc ends the chain and the tool together.
      const { cx, cy } = await canvasCentre(page);
      await page.mouse.click(cx - 100, cy);
      await page.waitForTimeout(300);
      await page.mouse.click(cx + 100, cy);
      await page.waitForTimeout(300);
    }
    await page.keyboard.press('Escape');
    await expect(add).not.toHaveAttribute('aria-current');
    await expect.poll(addBg).toBe(idle);
    await expect(edit).toHaveAttribute('aria-pressed', 'true');
  }

  // By key, too.
  await page.getByRole('application', { name: 'Floor plan' }).focus();
  await page.keyboard.press('w');
  await expect(add).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('Escape');
  await expect(add).not.toHaveAttribute('aria-current');
});

// Re-sweep 3 2026-09-30: Esc put the wall, window and door tools down, but
// the Measure tool stayed pressed.
test('Esc puts the Measure tool down', async ({ page }) => {
  await start(page);
  const measure = page.getByRole('button', { name: 'Measure tool' });
  const edit = page.getByRole('button', { name: 'Edit', exact: true });
  await measure.click();
  await expect(measure).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(measure).toHaveAttribute('aria-pressed', 'false');
  await expect(edit).toHaveAttribute('aria-pressed', 'true');

  // By key, too.
  await page.getByRole('application', { name: 'Floor plan' }).focus();
  await page.keyboard.press('m');
  await expect(measure).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(measure).toHaveAttribute('aria-pressed', 'false');
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
