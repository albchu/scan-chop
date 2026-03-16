import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/preload.ts'),
      formats: ['cjs'], // CommonJS format for Electron
      fileName: () => 'preload.cjs',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rolldownOptions: {
      external: ['electron'], // Electron is available in preload
      output: {
        // Bundle all @workspace/shared imports into a single chunk
        codeSplitting: false,
      },
    },
    // Target Node.js environment
    target: 'node22',
    // Minification off for easier debugging
    minify: false,
  },
  resolve: {
    alias: {
      '@workspace/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
