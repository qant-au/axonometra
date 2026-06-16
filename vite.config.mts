import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 4891, strictPort: true },
  preview: { host: '0.0.0.0', port: 4891, strictPort: true },
  build: {
    outDir: 'dist',
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
