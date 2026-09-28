import { test, expect } from '@playwright/test';

// The furniture drawer lists the shared element library by group, and adding
// an item puts it on the plan at its real footprint with its own icon. Uses
// the DEV-only window.__axo handle like undo-redo.spec.ts.

type Item = {
  width: number;
  height: number;
  texture: { width: number };
  serialize: () => { texturePath: string; width: number; height: number };
};
type Axo = {
  getMain: () => { bkgPattern?: unknown };
  getPlan: () => { getFurniture: () => Map<number, Item> };
};

test('add a server rack from the furniture drawer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new plan/i }).click();
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0, {
    timeout: 3000
  });
  const hasAxo = await page.evaluate(
    () =>
      typeof (window as unknown as { __axo?: unknown }).__axo !== 'undefined'
  );
  test.skip(!hasAxo, 'window.__axo is only present in DEV builds');
  await page.waitForFunction(
    () => !!(window as unknown as { __axo?: Axo }).__axo?.getMain().bkgPattern,
    undefined,
    { timeout: 5000 }
  );

  await page.getByRole('button', { name: 'Add', exact: true }).hover();
  await page.getByRole('menuitem', { name: 'Add furniture' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Comms and server room' }).click();
  await drawer.getByAltText('Server rack 42U, 600 × 1200').click();

  const added = await page.evaluate(() => {
    const items = [
      ...(window as unknown as { __axo: Axo }).__axo
        .getPlan()
        .getFurniture()
        .values()
    ];
    return items.map((i) => i.serialize());
  });
  expect(added).toHaveLength(1);
  expect(added[0].texturePath).toBe('rack-600x1200-42u');
  // Metres on the plan: 600 wide, 1200 deep.
  expect(added[0].width).toBeCloseTo(0.6, 5);
  expect(added[0].height).toBeCloseTo(1.2, 5);

  // Icons load on first use: the placeholder (Pixi's 1 × 1 white texture) is
  // swapped for the rack's own, and the sprite keeps its 60 × 120 footprint.
  await page.waitForFunction(() => {
    const item = [
      ...(window as unknown as { __axo: Axo }).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0];
    return item.texture.width > 1;
  });
  const drawn = await page.evaluate(() => {
    const item = [
      ...(window as unknown as { __axo: Axo }).__axo
        .getPlan()
        .getFurniture()
        .values()
    ][0];
    return { width: item.width, height: item.height };
  });
  expect(drawn.width).toBeCloseTo(60, 3);
  expect(drawn.height).toBeCloseTo(120, 3);
});

test('every catalogue icon is served', async ({ page, request }) => {
  await page.goto('/');
  const urls = await page.evaluate(async () => {
    const mod = await import('/src/res/catalog/index.ts');
    return (
      mod as { getCatalogImageUrls: () => string[] }
    ).getCatalogImageUrls();
  });
  expect(urls.length).toBeGreaterThan(20);
  for (const url of urls) {
    // Vite inlines small SVGs as data: URLs; larger ones are served files.
    if (url.startsWith('data:')) {
      const payload = url.slice(url.indexOf(',') + 1);
      const body = url.includes(';base64,')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
      expect(body, url.slice(0, 60)).toContain('<svg');
      continue;
    }
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(await res.text(), url).toContain('<svg');
  }
});
