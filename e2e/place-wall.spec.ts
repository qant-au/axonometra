import { test, expect, Page } from '@playwright/test';

// Critical-flow e2e: dismiss the welcome modal, switch to Wall tool via
// the dev-only window.__axo handle, place a couple of walls by clicking
// the canvas, save to localStorage with Ctrl+S, then reload and load it
// back. Driven by Tool.WallAdd = 0 (see src/editor/editor/constants.ts).

// __axo is only present in DEV builds — Playwright runs against the dev
// server (npm run dev) by default. If running against a prod build,
// these tests skip themselves.
async function hasDebugHandle(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      typeof (window as unknown as { __axo?: unknown }).__axo !== 'undefined'
  );
}

// Main.setup() runs after Pixi's Loader finishes loading the background
// pattern. Until it completes, this.on('pointerdown', this.checkTools)
// is not wired and canvas clicks are ignored. Wait for bkgPattern to be
// assigned as a proxy for setup completion.
async function waitForEditorReady(page: Page) {
  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __axo?: { getMain: () => { bkgPattern?: unknown } };
      };
      return !!w.__axo?.getMain().bkgPattern;
    },
    { timeout: 5000 }
  );
}

async function dismissWelcome(page: Page) {
  await page.getByRole('button', { name: /new plan/i }).click();
  // The modal closes via a Mantine transition that leaves the dialog and its
  // full-screen overlay in the DOM for a beat. Canvas clicks fired before the
  // overlay detaches land on the modal, not the Pixi viewport (0 nodes placed).
  // Wait for the modal to be gone before any canvas interaction.
  await expect(page.getByRole('button', { name: /new plan/i })).toHaveCount(0, {
    timeout: 3000
  });
}

async function selectWallTool(page: Page) {
  // Tool.WallAdd = 0. setTool also calls AddWallManager.resetTools().
  await page.evaluate(() => {
    const w = window as unknown as {
      __axo: { getStore: () => { setTool: (n: number) => void } };
    };
    w.__axo.getStore().setTool(0);
  });
}

async function getWallNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __axo: {
        getFloorPlan: () => {
          getWallNodeSeq: () => { getWallNodes: () => Map<number, unknown> };
        };
      };
    };
    return w.__axo.getFloorPlan().getWallNodeSeq().getWallNodes().size;
  });
}

async function getWallCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __axo: {
        getFloorPlan: () => {
          getWallNodeSeq: () => { getWalls: () => unknown[] };
        };
      };
    };
    return w.__axo.getFloorPlan().getWallNodeSeq().getWalls().length;
  });
}

test.describe('place-wall critical flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /new plan/i })).toBeVisible({
      timeout: 5000
    });
    await dismissWelcome(page);
    await expect(page.locator('canvas').first()).toBeVisible();
    if (!(await hasDebugHandle(page))) {
      test.skip(
        true,
        'window.__axo is only present in DEV builds — run against `npm run dev`'
      );
    }
    await waitForEditorReady(page);
  });

  test('placing two walls increments node and wall counts', async ({
    page
  }) => {
    await selectWallTool(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');

    // Three clicks → two walls. Coordinates chosen to be well clear of the
    // navbar (left ~70 px) and >= SNAP_THRESHOLD apart in canvas space.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 200, cy);
    await page.mouse.click(cx + 200, cy + 200);

    expect(await getWallNodeCount(page)).toBeGreaterThanOrEqual(2);
    expect(await getWallCount(page)).toBeGreaterThanOrEqual(1);
  });

  test('Ctrl+S writes the plan to localStorage', async ({ page }) => {
    await selectWallTool(page);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2 + 200, box.y + box.height / 2);

    await page.keyboard.press('Control+s');

    await expect(page.locator('text=Saved to Local Storage')).toBeVisible({
      timeout: 3000
    });

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('autosave')
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed).toHaveProperty('floors');
    expect(parsed).toHaveProperty('wallNodeId');
    expect(parsed.version).toBe(1);
  });

  test('round-trips a saved plan via "Load from local save"', async ({
    page
  }) => {
    // First session: place and save.
    await selectWallTool(page);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2 + 200, box.y + box.height / 2);
    await page.keyboard.press('Control+s');
    await expect(page.locator('text=Saved to Local Storage')).toBeVisible({
      timeout: 3000
    });

    const savedNodeCount = await getWallNodeCount(page);

    // Second session: reload, click "Load from local save", assert no
    // console errors and the node count matches.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.reload();
    await page.getByRole('button', { name: /load from local save/i }).click();
    await expect(page.locator('canvas').first()).toBeVisible();

    // Wait for the load to finish (the welcome modal closes synchronously
    // but FloorPlan.load runs on the next tick).
    await page.waitForFunction(
      (expected: number) => {
        const w = window as unknown as {
          __axo?: {
            getFloorPlan: () => {
              getWallNodeSeq: () => {
                getWallNodes: () => Map<number, unknown>;
              };
            };
          };
        };
        if (!w.__axo) return false;
        return (
          w.__axo.getFloorPlan().getWallNodeSeq().getWallNodes().size ===
          expected
        );
      },
      savedNodeCount,
      { timeout: 3000 }
    );

    expect(consoleErrors).toEqual([]);
  });
});
