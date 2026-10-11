import { test, expect, Page } from '@playwright/test';
import { hasAxo } from './axo';

// Height and mounting (scene format version 2): put a motion detector, which
// the catalogue mounts 2.4 m up a wall, on the ceiling, flush and facing
// down, from the item's right-click menu. The saved scene keeps the reference
// and the 3D view hangs it from the ceiling; one undo puts it back. Uses the
// DEV-only window.__axo handle like undo-redo.spec.ts.

type Bounds = { x: number; y: number; width: number; height: number };
type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getPlan: () => {
    getFurniture: () => Map<number, { getBounds: () => Bounds }>;
  };
  getSceneText: () => string;
  getSceneModel: () => Promise<{
    prisms: { kind: string; z0: number; z1: number }[];
  }>;
};
type Placement = {
  mountFrom?: string;
  mountMm?: number;
  mirror?: { z?: boolean };
};

async function centre(page: Page) {
  return page.evaluate(() => {
    const b = [
      ...(window as unknown as { __axo: Axo }).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0].getBounds();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
}

const placement = (page: Page) =>
  page.evaluate(() => {
    const scene = JSON.parse(
      (window as unknown as { __axo: Axo }).__axo.getSceneText()
    ) as { views: { kind: string; placements?: Placement[] }[] };
    return scene.views.find((v) => v.kind === 'plan')!.placements![0];
  });

test('set an item on the ceiling, flush, facing down', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Security' }).click();
  await drawer.getByAltText('Motion Detector (PIR)').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await placement(page)).toMatchObject({
    mountFrom: 'floor',
    mountMm: 2400
  });

  await page.getByRole('button', { name: 'Edit' }).click();
  const at = await centre(page);
  await page.mouse.click(at.x, at.y);
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Height and mounting...' }).click();

  const dialog = page.getByRole('dialog', { name: 'Height and mounting' });
  await dialog.getByRole('combobox', { name: 'Mounted on' }).click();
  await page.getByRole('option', { name: 'Ceiling' }).click();
  // Moving to the ceiling keeps the item where it was: 2.7 - 2.4 - 0.11.
  const gap = dialog.getByLabel('Gap below the ceiling (mm)');
  await expect(gap).toHaveValue('190');
  await gap.fill('0');
  await dialog.getByRole('combobox', { name: 'Facing' }).click();
  await page.getByRole('option', { name: 'Down' }).click();
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toHaveCount(0);

  expect(await placement(page)).toMatchObject({
    mountFrom: 'ceiling',
    mountMm: 0,
    mirror: { z: true }
  });
  // Flush under the default 2.7 m ceiling: the top at 270, the item 11 tall.
  const box = await page.evaluate(async () => {
    const model = await (
      window as unknown as { __axo: Axo }
    ).__axo.getSceneModel();
    return model.prisms.find((p) => p.kind === 'furniture')!;
  });
  expect(box.z1).toBeCloseTo(270, 3);
  expect(box.z0).toBeCloseTo(259, 3);

  // One edit, one undo.
  await page.keyboard.press('ControlOrMeta+z');
  expect(await placement(page)).toMatchObject({
    mountFrom: 'floor',
    mountMm: 2400
  });
});
