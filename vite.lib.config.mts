// The library build: @axonometra/editor, the <Axonometra> component
// (src/lib), as ES modules in dist-lib/. The app build (vite.config.mts)
// is separate and unchanged; it imports the same source.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };
import { emitAssetsAsFiles } from './vite/emitAssets';

// Every dependency stays a dependency: the host's package manager installs
// one copy of each. Pixi in particular must not be bundled, or a page with
// Pixi of its own would load two copies of its global registries.
const packages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {})
];
const external = (id: string) =>
  packages.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  plugins: [react(), emitAssetsAsFiles()],
  publicDir: false,
  // Asset URLs relative to the module that imports them (new URL(..., import.meta.url)),
  // not to the root of whatever site hosts the editor.
  base: './',
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    // Never inline an asset as a data: URL. Pixi fetch()es its textures and a
    // strict connect-src refuses data:, so they ship as files next to the code.
    assetsInlineLimit: 0,
    lib: {
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: () => 'index.mjs'
    },
    rollupOptions: {
      external,
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'chunks/[name]-[hash].mjs'
      }
    }
  }
});
