import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@shared$/, replacement: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
      // e.g. '@shared/limits': a single zod-free file, so pages that need one constant don't load zod
      { find: /^@shared\/(.+)$/, replacement: fileURLToPath(new URL('../shared/src', import.meta.url)) + '/$1' },
    ],
  },
  server: {
    port: 5173,
    // Dev: Vite and Express run separately; /api is forwarded so the browser still sees one origin.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'], css: false },
});
