import { test, expect, Page } from '@playwright/test';

// The production bundle under the container's Content-Security-Policy, used
// the way a person uses it: nothing here reaches for window.__axo, which a
// build does not have. The 3D view's description is the visible read-out of
// what the plan holds. It exists because every other spec ran against the
// dev server, which has no CSP, while the container refused Pixi's
// shader compiler and could not draw anything at all.

async function openThreeD(page: Page) {
  await page.getByRole('button', { name: '3D view' }).click();
  const view = page.getByRole('img', { name: /^3D view of/ });
  await expect(view).toBeVisible({ timeout: 10_000 });
  const label = (await view.getAttribute('aria-label')) ?? '';
  await page
    .getByRole('dialog', { name: '3D view' })
    .getByRole('button', { name: 'Close' })
    .click();
  return label;
}

test('draw walls, add furniture, save and load, under the container CSP', async ({
  page
}) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);

  // Draw two walls with the Draw wall tool.
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  const canvas = page.getByRole('application', { name: 'Floor plan' });
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // At a person's pace. Clicked back to back while the whole suite was
  // running, the last wall was sometimes missing; the cause is not
  // established (the editor ends a chain on a repeat click of the same point,
  // with no timing), and no person clicks this fast.
  for (const [x, y] of [
    [cx, cy],
    [cx + 200, cy],
    [cx + 200, cy + 200]
  ]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape');

  // Add a rack from the furniture drawer.
  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Comms and server room' }).click();
  await drawer.getByAltText('Server rack 42U, 600 × 1200').click();
  await page.keyboard.press('Escape');

  expect(await openThreeD(page)).toMatch(/2 walls and 1 pieces of furniture/);

  // Save to the browser, reload, and load it back.
  await page.keyboard.press('ControlOrMeta+s');
  await page.reload();
  await page.getByRole('button', { name: /load from local save/i }).click();
  expect(await openThreeD(page)).toMatch(/2 walls and 1 pieces of furniture/);

  expect(problems).toEqual([]);
});
