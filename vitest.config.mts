import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ is Playwright territory; vitest must not pick up its specs.
    exclude: ['node_modules', 'dist', 'build', 'e2e', 'playwright-out']
  }
});
