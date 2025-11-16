import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/spatial-view/', // GitHub Pages subfolder path
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'konva': ['konva'],
          'dexie': ['dexie'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
