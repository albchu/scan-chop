module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*'],
      env: {
        'vitest-globals/env': true,
      },
      extends: ['plugin:vitest-globals/recommended'],
    },
  ],
}; 