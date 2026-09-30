import { test, expect } from '@playwright/test';

test('axonometra loads, renders the welcome modal, and mounts a canvas', async ({
  page
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Axonometra');

  // The WelcomeModal opens with three actions: New plan / Load from disk /
  // Load from local save. The "Welcome to Axonometra" string itself shows in
  // a notification *after* the modal is dismissed, so we anchor on a stable
  // modal-visible button instead.
  await expect(page.getByRole('button', { name: /new plan/i })).toBeVisible({
    timeout: 5000
  });

  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 });

  expect(
    consoleErrors,
    `unexpected console errors: ${consoleErrors.join('\n')}`
  ).toEqual([]);
});

test('the toolbar stays visible and clickable in dark mode, after a reload too', async ({
  page
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  await page.getByRole('application', { name: 'Floor plan' }).focus();
  await page.keyboard.press('Alt+Shift+D');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('axonometra-theme')))
    .toBe('dark');

  // What a click at the middle of each button would hit.
  const hitsButton = (name: string) =>
    page.getByRole('button', { name, exact: true }).evaluate((button) => {
      const r = button.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2
      );
      return !!hit && button.contains(hit);
    });
  for (const name of ['Add', 'Edit', '3D view']) {
    expect(await hitsButton(name), name).toBe(true);
  }

  await page.reload();
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  expect(await hitsButton('Add')).toBe(true);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
});
