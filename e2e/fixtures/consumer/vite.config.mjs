import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under the Axonometra container's own Content-Security-Policy
// (passed in by scripts/verify-consumer.mjs), so the package is shown to work
// with no 'unsafe-eval' and no data: fetches.
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '127.0.0.1',
    port: 4893,
    strictPort: true,
    headers: { 'Content-Security-Policy': process.env.CONSUMER_CSP ?? '' }
  }
});
