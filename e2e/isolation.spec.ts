import { test, expect, Page, Locator } from '@playwright/test';

// Two <Axonometra> editors on one page (twin.html, dev server only) share
// nothing: a plan, undo, the keys, panning, notifications and textures all
// belong to the editor they happen in.

type Twin = 'a' | 'b';

const editor = (page: Page, which: Twin) =>
  page.getByRole('region', { name: which === 'a' ? 'Editor A' : 'Editor B' });

// Reads one editor's state through its API's debug handle.
function read<T>(page: Page, which: Twin, body: string): Promise<T> {
  return page.evaluate(
    ([w, b]) => {
      const api = (window as unknown as Record<string, Record<string, unknown>>)
        .__axoTwin[w] as { debug: Record<string, () => unknown> } | null;
      if (!api) return null;
      return new Function('d', `return (${b})(d)`)(api.debug);
    },
    [which, body] as const
  ) as Promise<T>;
}

const nodes = (page: Page, which: Twin) =>
  read<number>(
    page,
    which,
    'd => d.plan().getWallNodeSeq().getWallNodes().size'
  );
const tool = (page: Page, which: Twin) =>
  read<number>(page, which, 'd => d.editor().activeTool');
const panX = (page: Page, which: Twin) =>
  read<number>(page, which, 'd => d.main().x');

async function canvasCentre(area: Locator) {
  const box = await area
    .getByRole('application', { name: 'Floor plan' })
    .boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drawWall(page: Page, which: Twin) {
  const area = editor(page, which);
  await area.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Draw wall' }).click();
  const c = await canvasCentre(area);
  await page.mouse.click(c.x - 60, c.y);
  await page.mouse.click(c.x + 60, c.y);
  await page.keyboard.press('Escape');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/twin.html');
  await page.waitForFunction(() => {
    const t = (window as unknown as { __axoTwin?: Record<string, unknown> })
      .__axoTwin;
    // Each editor finishes its setup (and centres its view) once the
    // background pattern has loaded.
    const ready = (api: unknown) =>
      !!(
        api as { debug?: { main(): { bkgPattern?: unknown } | null } } | null
      )?.debug?.main()?.bkgPattern;
    return !!t && ready(t.a) && ready(t.b);
  });
});

test('a plan and its undo belong to one editor', async ({ page }) => {
  await drawWall(page, 'a');
  expect(await nodes(page, 'a')).toBe(2);
  expect(await nodes(page, 'b')).toBe(0);

  // B has nothing to undo; A's wall is untouched.
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __axoTwin: { b: { undo(): boolean } } }
      ).__axoTwin.b.undo()
    )
  ).toBe(false);
  expect(await nodes(page, 'a')).toBe(2);
});

test('keys pressed in one editor do not reach the other', async ({ page }) => {
  const a = await canvasCentre(editor(page, 'a'));
  await page.mouse.click(a.x, a.y);
  const before = await tool(page, 'b');
  await page.keyboard.press('v');
  expect(await tool(page, 'a')).not.toBe(before);
  expect(await tool(page, 'b')).toBe(before);
});

test('panning one editor leaves the other where it was', async ({ page }) => {
  const b = await panX(page, 'b');
  const a = await canvasCentre(editor(page, 'a'));
  const aBefore = await panX(page, 'a');
  // The hand tool (the default) pans with a left drag.
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x - 80, a.y, { steps: 8 });
  await page.mouse.up();
  expect(await panX(page, 'a')).not.toBe(aBefore);
  expect(await panX(page, 'b')).toBe(b);
});

test('a notification shows in its own editor only', async ({ page }) => {
  await page.evaluate(() =>
    (
      window as unknown as {
        __axoTwin: { a: { notify(o: { message: string }): void } };
      }
    ).__axoTwin.a.notify({ message: 'Only editor A' })
  );
  await expect(page.getByText('Only editor A')).toHaveCount(1);
});

test('removing one editor leaves the other working', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove editor A' }).click();
  await expect(editor(page, 'a').getByRole('application')).toHaveCount(0);
  // Textures are shared by the page; A's teardown must not destroy them.
  expect(
    await read<boolean>(page, 'b', 'd => d.main().bkgPattern.texture.destroyed')
  ).toBe(false);
  await drawWall(page, 'b');
  expect(await nodes(page, 'b')).toBe(2);
});
