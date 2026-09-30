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
