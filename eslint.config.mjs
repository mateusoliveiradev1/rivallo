import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', '.turbo/', 'target/'],
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
