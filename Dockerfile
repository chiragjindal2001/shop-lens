# syntax=docker/dockerfile:1
# One image: Express serves /api/* and the built React client (same origin, no nginx).

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

FROM deps AS build
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
RUN npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production PORT=8080 CLIENT_DIST=/app/client/dist
WORKDIR /app
# The server bundle inlines @shared; only the runtime npm deps are installed.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev -w server -w shared --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY server/kb server/kb
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/server.js"]
