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
        manualChunks: {
          pixi: ['pixi.js', 'pixi-viewport'],
          mantine: [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/notifications',
            '@mantine/dropzone'
          ]
        }
      }
    }
  }
});
