import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The container's Content-Security-Policy, copied from docker/nginx.conf
// (a unit test keeps the two identical). `vite preview` sends it so the
// production e2e project runs under the same policy the container serves:
// the dev server cannot, because React's dev preamble is an inline script.
export const CONTAINER_CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'self';";

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 4891, strictPort: true },
  // three.js and its add-ons are only reached through lazy imports (the 3D
  // view and the embed export), so the dev server would discover them on
  // first use and reload the page mid-session. Pre-bundle them at startup.
  optimizeDeps: {
    include: [
      'three',
      'three/addons/controls/OrbitControls.js',
      'three/addons/exporters/GLTFExporter.js',
      'three/addons/utils/BufferGeometryUtils.js'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 4892,
    strictPort: true,
    headers: { 'Content-Security-Policy': CONTAINER_CSP }
  },
  build: {
    outDir: 'dist',
    // Never inline SVGs as data: URLs. Pixi fetch()es its textures, and the
    // container's connect-src 'self' refuses a data: URL, so an inlined icon
    // fails to load there. As files they are same-origin requests.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
    // Source maps stay off until error tracking (e.g. Sentry) is wired up;
    // switch to 'hidden' then so maps upload but aren't served. (#53)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Function form: the array form leaves react/react-dom absorbed into
        // the mantine chunk (and emits an empty `react` chunk), so match the
        // vendor packages by resolved path instead.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/pixi.js/') || id.includes('/pixi-viewport/'))
            return 'pixi';
          if (id.includes('/@pixi/')) return 'pixi';
          if (id.includes('/@mantine/')) return 'mantine';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          )
            return 'react';
        }
      }
    }
  }
});
