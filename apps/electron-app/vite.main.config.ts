import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

// Bundle the Electron main process so it's self-contained.
// This eliminates runtime node_modules resolution inside the asar archive,
// which is fragile for nested dependency version conflicts (e.g. CJS/ESM interop).
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rolldownOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        codeSplitting: false,
      },
    },
    target: 'node24',
    minify: false,
  },
});
