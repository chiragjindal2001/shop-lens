import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) } },
  server: {
    port: 5173,
    // Dev: Vite and Express run separately; /api is forwarded so the browser still sees one origin.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'], css: false },
});
