import { test, expect, Page } from '@playwright/test';

// The package from the outside (AXO_CONSUMER=1): @axonometra/editor packed,
// installed from its tarball with its peers from npm, built by a host's Vite
// and served under the container CSP (scripts/verify-consumer.mjs). Two
// editors on the page, as a third party would use it.

const problems: string[] = [];

async function ready(page: Page) {
  await page.waitForFunction(() => {
    const t = (window as unknown as { __axoTwin?: Record<string, unknown> })
      .__axoTwin;
    const up = (api: unknown) =>
      !!(
        api as { debug?: { main(): { bkgPattern?: unknown } | null } } | null
      )?.debug?.main()?.bkgPattern;
    return !!t && up(t.a) && up(t.b);
  });
}

test.beforeEach(async ({ page }) => {
  problems.length = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('/');
  await ready(page);
});

test('two editors start, under the CSP, with no errors', async ({ page }) => {
  await expect(
    page.getByRole('application', { name: 'Floor plan' })
  ).toHaveCount(2);
  expect(problems).toEqual([]);
});

test('a plan drawn in one editor stays in it', async ({ page }) => {
  const a = page.getByRole('region', { name: 'Editor A' });
  await a.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  const box = (await a
    .getByRole('application', { name: 'Floor plan' })
    .boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 - 60, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 60, box.y + box.height / 2);
  await page.keyboard.press('Escape');
  const count = (which: 'a' | 'b') =>
    page.evaluate(
      (w) =>
        (
          window as unknown as {
            __axoTwin: Record<
              string,
              {
                debug: {
                  plan(): {
                    getWallNodeSeq(): { getWallNodes(): Map<number, unknown> };
                  };
                };
              }
            >;
          }
        ).__axoTwin[w].debug
          .plan()
          .getWallNodeSeq()
          .getWallNodes().size,
      which
    );
  expect(await count('a')).toBe(2);
  expect(await count('b')).toBe(0);
  expect(problems).toEqual([]);
});

test('furniture, doors and the help load their images', async ({ page }) => {
  const a = page.getByRole('region', { name: 'Editor A' });
  // A catalogue item: its image is a texture Pixi loads.
  await a.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: /sofa/i }).first().click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  // The help animations are images shipped with the package; the wall
  // tool's help has one.
  await a.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  await a.getByRole('button', { name: 'Help' }).click();
  const help = page.locator('img[src*="gif"]').first();
  await expect(help).toBeVisible();
  expect(
    await help.evaluate((img: HTMLImageElement) => img.naturalWidth)
  ).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});
