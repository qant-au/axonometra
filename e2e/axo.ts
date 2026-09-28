import type { Page } from '@playwright/test';

/**
 * Whether the DEV-only window.__axo test handle is present. The editor sets
 * it once Pixi has started, a moment after the page loads, so wait for it:
 * checking at once raced the start-up and skipped tests at random. A
 * production build never sets it, so after the wait this is false.
 */
export async function hasAxo(page: Page, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __axo?: unknown }).__axo !== 'undefined',
      undefined,
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}
