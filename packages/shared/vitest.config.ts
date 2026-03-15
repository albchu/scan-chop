import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Vitest 4 no longer auto-excludes dist/ — prevent discovering compiled test files
    exclude: ['dist/**', 'node_modules/**'],
  },
});
