import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  {
    // Database and LLM vendor code may only be imported inside server/src/infra/.
    files: ['server/src/**/*.ts'],
    ignores: ['server/src/infra/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['mongoose', 'mongodb', 'mongodb/*'], message: 'Database code belongs in server/src/infra/.' },
            { group: ['**/infra/**'], message: 'Only the composition root (container.ts, server.ts, bootstrap.ts) may import infra/.' },
          ],
        },
      ],
    },
  },
  {
    files: ['server/src/container.ts', 'server/src/server.ts', 'server/src/bootstrap.ts', 'server/src/scripts/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Untyped JSON from the LLM wire format and loosely-typed test assertions.
    files: ['server/tests/**/*.ts', '**/*.test.ts', '**/*.test.tsx', 'server/src/infra/llm/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
