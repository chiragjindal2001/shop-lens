import path from 'node:path';
import { existsSync } from 'node:fs';
import express, { type Express } from 'express';

/** Serves the built client with an SPA fallback. No nginx: one origin, one container. */
export function mountStatic(app: Express, distDir: string | undefined): void {
  if (!distDir || !existsSync(path.join(distDir, 'index.html'))) return;
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, file) => {
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}
