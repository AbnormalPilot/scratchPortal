import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

/** Shared baseline: applies to every package in the monorepo. */
export const baseConfig = defineConfig([
  globalIgnores(['dist', 'node_modules', 'generated']),
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
]);

export default baseConfig;
