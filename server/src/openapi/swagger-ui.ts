import type { Express, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './spec';

// Swagger UI needs inline styles; scripts stay same-origin only. Applied to the docs path only, the rest of
// the API keeps helmet's strict default policy.
const docsCsp: RequestHandler = (_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
  );
  next();
};

/** Serves the OpenAPI document at /api/openapi.json and Swagger UI at /api/docs. */
export function mountDocs(app: Express): void {
  const spec = buildOpenApiSpec();
  app.get('/api/openapi.json', (_req, res) => {
    res.json(spec);
  });
  app.use(
    '/api/docs',
    docsCsp,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Shoplens API',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }),
  );
}
