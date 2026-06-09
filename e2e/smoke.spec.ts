import { test, expect } from '@playwright/test';

test('axonometra loads, renders the welcome modal, and mounts a canvas', async ({ page }) => {
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
    timeout: 5000,
  });

  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 });

  // The upstream arcada-backend (Express) is not part of this fork; calls
  // to the default http://localhost:4133/ endpoint surface as
  // ERR_CONNECTION_REFUSED until a real backend is wired up. Allow those;
  // fail on anything else.
  const unexpected = consoleErrors.filter(
    (msg) => !/ERR_CONNECTION_REFUSED|Failed to load resource/.test(msg),
  );
  expect(unexpected, `unexpected console errors: ${unexpected.join('\n')}`).toEqual([]);
});
