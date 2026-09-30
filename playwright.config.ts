import { defineConfig, devices } from '@playwright/test';
import { generateKeyPairSync } from 'node:crypto';

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

// Signed embedding (e2e/embed-signed.spec.ts): a throwaway P-256 key pair
// per run, so no key is ever committed. The dev server gets the public key
// and the fake host origin; the specs sign with the private key, which
// reaches the workers through the environment. Only ?embed=1 pages are
// affected. A dev server reused from outside this run will not have the
// key, so run that spec against the server Playwright starts.
// 127.0.0.1 and localhost are different origins; both are local, which
// Chrome's Private Network Access rules require for the host to frame it.
export const EMBED_HOST_ORIGIN = 'http://127.0.0.1:4891';
if (!process.env.AXO_E2E_PLAN_PRIVATE_KEY) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256'
  });
  process.env.AXO_E2E_PLAN_PUBLIC_KEY = publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
  process.env.AXO_E2E_PLAN_PRIVATE_KEY = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
}

// The npm package from the outside (scripts/verify-consumer.mjs): opt in with
// AXO_CONSUMER=1, since it packs, installs from the registry and builds.
const consumer = process.env.AXO_CONSUMER === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'playwright-out/test-results',
  // Only auto-start servers when no external base URL is supplied: the dev
  // server for the main suite, and the production build under the
  // container's CSP (vite preview, 4892) for the production project.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        ...(consumer
          ? [
              {
                command: 'node scripts/verify-consumer.mjs',
                url: 'http://127.0.0.1:4893',
                reuseExistingServer: false,
                timeout: 600_000
              }
            ]
          : []),
        {
          command: 'npm run dev',
          url: 'http://localhost:4891',
          reuseExistingServer: !process.env.CI,
          env: {
            VITE_EMBED_ALLOWED_ORIGINS: EMBED_HOST_ORIGIN,
            VITE_EMBED_PLAN_PUBLIC_KEYS:
              process.env.AXO_E2E_PLAN_PUBLIC_KEY ?? ''
          },
          timeout: 120_000
        },
        {
          command: 'npm run build && npx vite preview',
          url: 'http://localhost:4892',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000
        }
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/\.prod\.spec\.ts$/, /consumer\.spec\.ts$/],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      // The production bundle as the container serves it, CSP included.
      // Specs here use the UI only: window.__axo does not exist in a build.
      name: 'production',
      testMatch: /\.prod\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4892'
      }
    },
    ...(consumer
      ? [
          {
            name: 'consumer',
            testMatch: /consumer\.spec\.ts$/,
            use: {
              ...devices['Desktop Chrome'],
              baseURL: 'http://127.0.0.1:4893'
            }
          }
        ]
      : [])
  ]
});
