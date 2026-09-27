import { test, expect } from '@playwright/test';

// The axonometric view: draw a small room with a door, open the view from the
// toolbar, and turn it. Tools go through the DEV-only window.__axo handle
// (Tool.WallAdd = 0, Tool.FurnitureAddDoor = 5).

type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getStore: () => { setTool: (n: number) => void };
};

test('shows the plan in an axonometric view that can be turned', async ({
  page
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  const hasAxo = await page.evaluate(
    () =>
      typeof (window as unknown as { __axo?: unknown }).__axo !== 'undefined'
  );
  test.skip(!hasAxo, 'window.__axo is only present in DEV builds');
  await page.waitForFunction(
    () => !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern
  );
  const setTool = (n: number) =>
    page.evaluate(
      (t) => (window as unknown as { __axo: Axo }).__axo.getStore().setTool(t),
      n
    );

  // Empty plan: the view says so rather than drawing nothing.
  await page.getByRole('button', { name: 'Axonometric view' }).click();
  await expect(page.getByText('Draw some walls on this floor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Three walls around a corner, and a door in the first.
  const box = (await page.locator('canvas').first().boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await setTool(0);
  for (const [dx, dy] of [
    [0, 0],
    [300, 0],
    [300, 200],
    [0, 200]
  ]) {
    await page.mouse.click(cx + dx, cy + dy);
  }
  await setTool(5);
  await page.mouse.click(cx + 150, cy);

  await page.getByRole('button', { name: 'Axonometric view' }).click();
  const drawing = page.getByRole('img', {
    name: /Axonometric view of floor 0/
  });
  await expect(drawing).toHaveAttribute(
    'aria-label',
    /3 walls and 1 pieces of furniture, turned 0 degrees/
  );
  // Slab, three walls and the door: every box shows a top and a side or two.
  expect(await drawing.locator('polygon').count()).toBeGreaterThanOrEqual(10);

  const before = await drawing
    .locator('polygon')
    .first()
    .getAttribute('points');
  await page.getByRole('button', { name: 'Turn right' }).click();
  await expect(drawing).toHaveAttribute('aria-label', /turned 90 degrees/);
  const after = await drawing.locator('polygon').first().getAttribute('points');
  expect(after).not.toBe(before);
});
