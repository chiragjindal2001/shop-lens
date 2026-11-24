import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) } },
  test: {
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
