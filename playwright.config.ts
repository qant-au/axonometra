import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Axonometra.
 *
 * - By default the suite self-hosts the Vite dev server (`npm run dev`) on
 *   http://localhost:4891 and points the tests at it. The specs need the
 *   dev-only `window.__axo` introspection handle, which production bundles
 *   omit, so the dev server (not a prod build) is the meaningful target.
 * - Set PLAYWRIGHT_BASE_URL to run against an already-running instance (e.g.
 *   the Docker container from `bash restart.sh` on http://localhost:4890);
 *   in that case no server is auto-started.
 * - Run from the repo root: `npm run test:e2e`.
 * - First-time setup on a fresh clone: `npx playwright install chromium`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4891';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'playwright-out/test-results',
  // Only auto-start the dev server when no external base URL is supplied.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:4891',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      },
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
