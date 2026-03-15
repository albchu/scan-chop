// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitestGlobals from 'eslint-plugin-vitest-globals';

export default tseslint.config(
  // Global ignores (replaces ignorePatterns from .eslintrc.js)
  {
    ignores: ['**/dist/**'],
  },

  // Base recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Project-wide rule overrides for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Vitest globals for test files (replaces packages/ui/.eslintrc.js overrides)
  {
    files: ['**/__tests__/**/*', '**/*.test.*'],
    ...vitestGlobals.configs['flat/recommended'],
  }
);
