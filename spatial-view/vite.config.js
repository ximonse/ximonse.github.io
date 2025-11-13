import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/', // <-- ÄNDRINGEN ÄR HÄR. Från '/spatial-view/' till '/'
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