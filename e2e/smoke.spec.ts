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

// Re-sweep 3 2026-09-30: a scene file with no id showed "Load failed" but
// closed the welcome dialog too, leaving an empty plan and no New plan button.
test('a load from the welcome dialog that fails leaves it open', async ({
  page
}) => {
  await page.goto('/');
  const welcome = page.getByRole('dialog');
  await expect(
    welcome.getByRole('button', { name: /new plan/i })
  ).toBeVisible();
  const scene = { format: 'accurona-scene', version: 1, icons: {} };
  await welcome.locator('input[type=file]').setInputFiles({
    name: 'bad-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(scene))
  });
  await expect(page.getByText('Load failed')).toBeVisible();
  await expect(
    welcome.getByRole('button', { name: /new plan/i })
  ).toBeVisible();
  // It can still start a new plan (which a closing dialog would ignore).
  await welcome.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0);
  await expect(page.getByText(/Welcome to Axonometra/)).toBeVisible();
});

test.describe('on a phone held upright', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('every tool fits on screen and the welcome note leaves them clear', async ({
    page
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new plan/i }).click();
    const note = page.getByText(/Welcome to Axonometra/);
    await expect(note).toBeVisible();
    const load = (await page
      .getByRole('button', { name: 'Load plan' })
      .boundingBox())!;
    expect(load.y + load.height).toBeLessThanOrEqual(844);
    const toolbarRight = load.x + load.width;
    const alert = (await page.getByRole('alert').boundingBox())!;
    expect(alert.x).toBeGreaterThan(toolbarRight);
  });

  // Re-sweep 2026-09-30: the welcome note drew over the Keyboard shortcuts
  // dialog. Dialogs sit above notifications.
  test('a dialog opens over the welcome note', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new plan/i }).click();
    const note = page.getByRole('alert');
    await expect(note).toBeVisible();
    const box = (await note.boundingBox())!;
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    // Whatever is on top where the note is belongs to the dialog.
    const onTop = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return !el?.closest('[role=alert]');
      },
      [box.x + box.width / 2, box.y + box.height / 2]
    );
    expect(onTop).toBe(true);
    // Re-sweep 2: nor does a strip of it show beside the dialog, which is
    // narrower than the screen.
    await expect(note).toBeHidden();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(note).toBeVisible();
  });

  // Re-sweep 3 2026-09-30: the Help panel is not modal, and the welcome note
  // stayed visible and clickable under it on a phone.
  test('the welcome note hides under the Help panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new plan/i }).click();
    // A CSS locator: a hidden note leaves the accessibility tree.
    const note = page.locator('[role=alert]');
    await expect(note).toBeVisible();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const help = page.getByRole('dialog', { name: /^Help: / });
    await expect(help).toBeVisible();
    // Hidden, not dismissed: the note times out by itself, which a plain
    // toBeHidden would also accept.
    await expect(note).toHaveCSS('visibility', 'hidden');
    await help.getByRole('button', { name: 'Close' }).click();
    await expect(help).toHaveCount(0);
    await expect(note).toHaveCSS('visibility', 'visible');
  });

  test('the welcome dialog still shows a load that failed', async ({
    page
  }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: /load from local save/i }).click();
    await expect(page.getByRole('button', { name: /new plan/i })).toBeVisible();
    await expect(page.getByText('No autosave found')).toBeVisible();
  });
});
