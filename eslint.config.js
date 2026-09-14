import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'archive/**',
      'features_backup/**',
      'rules_backup/**',
      'scoring_duplicates/**',
      'sessions_backup/**',
      'src/types/lucide-react.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.{js,mjs}', 'playwright.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        fetch: 'readonly',
      },
    },
    rules: {
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['tools/**/*.{js,mjs}', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        fetch: 'readonly',
      },
    },
    rules: {
      'no-useless-escape': 'off',
    },
  },
);
