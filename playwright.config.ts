import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Axonometra.
 *
 * - The tests hit the standalone Docker container served by `bash restart.sh`
 *   on http://localhost:4890 by default. Override with PLAYWRIGHT_BASE_URL.
 * - Run from the repo root: `npm run test:e2e`.
 * - First-time setup on a fresh clone: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'playwright-out/test-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4890',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
