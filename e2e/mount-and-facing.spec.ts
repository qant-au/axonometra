import { readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Mount and facing, end to end in the browser (lw-112). The fixture is one
// room on a 2.4 m ground floor and a 2.7 m first floor, each with a recessed
// downlight, a pendant, a dome camera, a wall TV, a table lamp on a bedside
// table and a smoke detector. The heights per view are pinned in
// src/editor/__tests__/mountAndFacing.test.ts; this drives the real app:
// open, save, reopen; the 3D view cut and uncut; the isometric view's
// facing marks; and the same scene reopened with a different wall height.
// Uses the DEV-only window.__axo handle.

const FIXTURE = 'e2e/fixtures/mount-and-facing.scene.json';

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getPlan: () => { changeFloor: (by: number) => void };
  getStore: () => { setHeightTags: (on: boolean) => void };
  getSceneModel: () => Promise<{
    prisms: { kind: string; z0: number; z1: number }[];
  }>;
};

/** Open a scene: the welcome box's Load from disk, then the toolbar's Load plan. */
async function load(page: Page, text: string) {
  const welcome = page.getByRole('button', { name: /load from disk/i });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    (await welcome.isVisible())
      ? welcome.click()
      : page.getByRole('button', { name: 'Load plan', exact: true }).click()
  ]);
  await chooser.setFiles({
    name: 'scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text)
  });
  await page.waitForFunction(
    () => !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern,
    undefined,
    { timeout: 5000 }
  );
}

/** Save the plan from the toolbar and read the file it downloads. */
async function save(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save plan', exact: true }).click()
  ]);
  const { readFile } = await import('node:fs/promises');
  return readFile((await download.path())!, 'utf8');
}

/** The items' [underside, top] on the current floor, uncut, sorted. */
const spans = (page: Page) =>
  page.evaluate(async () => {
    const model = await (
      window as unknown as { __axo: Axo }
    ).__axo.getSceneModel();
    return model.prisms
      .filter((p) => p.kind === 'furniture')
      .map((p) => [Math.round(p.z0 * 100) / 100, Math.round(p.z1 * 100) / 100])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  });

// Underside and top in cm above ground for a floor at `base` with a ceiling
// `wall` cm up, sorted like `spans`.
const expected = (base: number, wall: number) =>
  [
    [wall - 1, wall + 9], // downlight, recessed
    [wall - 80, wall], // pendant
    [wall - 10, wall], // dome camera
    [110, 195], // wall TV
    [0, 55], // bedside table
    [55, 105], // table lamp
    [wall - 5, wall] // smoke detector
  ]
    .map(([a, b]) => [base + a, base + b])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

test('mount and facing: save, reload, and every view', async ({
  page
}, testInfo) => {
  await page.goto('/');
  test.skip(
    !(await hasAxo(page)),
    'window.__axo is only present in DEV builds'
  );
  const fixture = readFileSync(FIXTURE, 'utf8');
  await load(page, fixture);

  // Saves and reloads identically, keeping every reference as written.
  const once = await save(page);
  await load(page, once);
  expect(await save(page)).toBe(once);
  type P = {
    object: string;
    mountFrom?: string;
    mountMm?: number;
    mountOn?: string;
  };
  const refs = (text: string) =>
    (JSON.parse(text) as { views: { kind: string; placements: P[] }[] }).views
      .find((v) => v.kind === 'plan')!
      .placements.map(({ object, mountFrom, mountMm, mountOn }) => ({
        object,
        mountFrom,
        mountMm,
        ...(mountOn ? { mountOn } : {})
      }));
  expect(refs(once)).toEqual(refs(fixture));

  // Heights in 3D on both floors.
  expect(await spans(page)).toEqual(expected(0, 240));
  await page.evaluate(() =>
    (window as unknown as { __axo: Axo }).__axo.getPlan().changeFloor(1)
  );
  expect(await spans(page)).toEqual(expected(300, 270));
  await page.evaluate(() =>
    (window as unknown as { __axo: Axo }).__axo.getPlan().changeFloor(-1)
  );

  // The plan, with height tags, for the record.
  await page.evaluate(() =>
    (window as unknown as { __axo: Axo }).__axo.getStore().setHeightTags(true)
  );
  await page.screenshot({
    path: testInfo.outputPath('plan.png'),
    animations: 'disabled'
  });

  // 3D: the four ceiling items are above the 1.2 m cut and drawn as
  // outlines; uncut, all seven are pieces.
  await page.getByRole('button', { name: '3D view' }).click();
  const view = page.getByRole('img', { name: /^3D view of floor 0/ });
  await expect(view).toHaveAttribute(
    'aria-label',
    /3 pieces of furniture \(4 more above the cut, drawn as outlines\), walls cut away/,
    { timeout: 10000 }
  );
  await page.screenshot({
    path: testInfo.outputPath('3d-cut.png'),
    animations: 'disabled'
  });
  await page.getByRole('switch', { name: 'Cut away walls' }).click();
  await expect(view).toHaveAttribute('aria-label', /7 pieces of furniture\./);
  await page.screenshot({
    path: testInfo.outputPath('3d-uncut.png'),
    animations: 'disabled'
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Isometric: a down arrow (a shaft and a head) on each item facing down
  // (downlight, dome, smoke detector), none once the ceiling items are hidden.
  await page.getByRole('button', { name: 'Axonometric view' }).click();
  const iso = page.getByRole('img', { name: /Axonometric view of floor 0/ });
  await expect(iso.locator('polyline[data-facing="down"]')).toHaveCount(6);
  await page.screenshot({
    path: testInfo.outputPath('iso.png'),
    animations: 'disabled'
  });
  await page.getByRole('switch', { name: 'Hide ceiling items' }).click();
  await expect(iso.locator('polyline[data-facing="down"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // The ground floor's ceiling raised to 2.55 m: only the ceiling items move.
  const scene = JSON.parse(fixture);
  scene.views[0].floors[0].wallHeightMm = 2550;
  await load(page, JSON.stringify(scene));
  expect(await spans(page)).toEqual(
    [
      [254, 264],
      [175, 255],
      [245, 255],
      [110, 195],
      [0, 55],
      [55, 105],
      [250, 255]
    ].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  );
});
