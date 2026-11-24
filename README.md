# Shoplens: AI customer support agent

An AI support chat for a fictional Indian electronics store. Customers sign up, chat with an assistant that
streams its replies, and the assistant acts on the **logged-in user's own orders** through tools (status,
returns, cancellations, human escalation).

- **Live demo:** _add deployed link_
- **Walkthrough (Loom):** _add link_
- **Demo login:** `demo@shoplens.in` / `Demo@1234` (or press **Try the demo account** on the login page)

> **Status:** the full build plan is implemented, including RAG over the store policies. Policy answers come
> from `server/kb/*.md` via the `search_policies` tool and show a "Source: …" tag in the UI.

## Features

- [x] JWT signup / login / logout, bcrypt (cost 12), protected routes (client and server)
- [x] Chat with streamed AI replies (real token streaming over SSE), typing/tool-status indicator
- [x] MongoDB chat history scoped per user, past conversations sidebar, delete conversation
- [x] Required endpoints: `/auth/signup`, `/auth/login`, `/chat/send`, `/chat/history`
- [x] Tool calling: orders, return eligibility, return requests, cancellation, support tickets
- [x] Idempotent sends, partial-reply saving on disconnect, LLM timeout / retry / model fallback
- [x] `express-rate-limit` (auth by IP, chat by user), helmet, strict CORS, Zod validation everywhere
- [x] Docker Compose (the app container, talking to MongoDB Atlas), dev/prod config, `.env.example` files, CI
- [x] RAG: policy knowledge base (Markdown → chunks → embeddings → Atlas Vector Search), source tags on answers

Beyond the brief's two auth endpoints, `/auth/refresh`, `/auth/logout` and `/auth/me` are deliberate: they
make the httpOnly-cookie refresh flow and real (server-side) logout possible.

## Quick start

```bash
cp server/.env.example server/.env   # fill in your Atlas MONGO_* values, JWT secrets and OPENROUTER_API_KEY
                                     # (or set LLM_PROVIDER=mock for scripted replies without a key)
docker compose up --build
# open http://localhost:8080
```

Docker reads the same `server/.env` as the dev server (no local MongoDB container: it uses your Atlas cluster).
Make sure Atlas **Network Access** allows your IP.

Manual dev setup (Node 24+):

```bash
npm install
cp server/.env.example server/.env     # fill in OPENROUTER_API_KEY, or LLM_PROVIDER=mock
cp client/.env.example client/.env
npm run dev:server                     # http://localhost:4000
npm run dev:client                     # http://localhost:5173 (proxies /api to :4000)
```

Server startup is idempotent: it creates indexes and seeds the demo user. New signups also get 4 mock orders
(`SE1039`–`SE1042`) so the tools have real data: one return-eligible, one shipped, one cancellable, one
outside the return window.

### Environment variables (`server/.env.example`)

| Variable | Purpose |
|---|---|
| `MONGO_HOST`, `MONGO_PORT` | MongoDB host and port (port ignored when `MONGO_SRV=true`) |
| `MONGO_DB_NAME` | Database name |
| `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_AUTH_SOURCE` | Credentials (leave empty only for a MongoDB without auth); the password is URL-encoded for you |
| `MONGO_SRV` | `true` for Atlas `mongodb+srv://` hosts |
| `MONGO_OPTIONS` | Extra options, e.g. `retryWrites=true&w=majority` on Atlas, or `directConnection=true` for a single local mongod |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different secrets, 32+ chars each |
| `OPENROUTER_API_KEY` | Required unless `LLM_PROVIDER=mock` |
| `LLM_MODELS` | Comma-separated: first is primary, the rest are OpenRouter fallbacks |
| `LLM_MAX_TOKENS` | Max output tokens per model call (default 500). Caps reply length and cost; a reply that hits it is cut off and a warning is logged |
| `EMBEDDING_MODEL` | Embedding model for RAG (default `openai/text-embedding-3-small`) |
| `EMBEDDING_DIMENSIONS` | Vector size; must match the model and the vector index (default 1536) |
| `KB_MIN_SCORE` | Optional. Minimum cosine similarity for a chunk to count as relevant (default 0.35; 0.12 with the mock) |
| `KB_DIR` | Optional. Knowledge-base folder (default `./kb` or `./server/kb`) |
| `CLIENT_ORIGIN` | Allowed CORS origin |
| `LLM_PROVIDER` | `openrouter` (default) or `mock` |
| `TRUST_PROXY` | Proxies in front of Express (Vercel + Render = 2). Needed for correct per-IP limits |
| `COOKIE_SECURE` | Defaults to true in production; `false` for plain-http hosting (local compose) |
| `NODE_ENV`, `PORT` | Standard. Invalid config fails fast at boot with a readable message |

`client/.env.example`: `VITE_API_BASE_URL` (default `/api`; keep it relative so the cookie stays first-party).

## Architecture

```
Browser ──► one origin ──► Express (API + built client) ──► MongoDB   (users, sessions, conversations,
                                   │                                  messages, orders, returns, tickets)
                                   └──────────────────────► OpenRouter (chat, with fallback models)
```

Request flow for one chat message:

1. The client `POST`s `/api/chat/send` with the access token and an idempotency key (UUID per message).
2. Middleware authenticates, applies the per-user rate limit and validates the body (Zod, max 2,000 chars).
3. The service saves the user message, creates a placeholder assistant message and opens the SSE stream.
4. The agent loop calls the LLM; tool calls run through `userId`-scoped services or the knowledge base (max 4 tool rounds).
5. Tokens stream to the browser as they arrive (`meta`, `tool`, `token`, `sources`, `done`, `error` events).
6. The final reply, tool calls and status (`complete` / `partial` / `error`) are saved.

### Code organisation

`routes → controller → service → repository interface → infra adapter`. Dependencies only point that way.

- `server/src/modules/*` is business logic and **may not import a database or LLM vendor**. ESLint
  (`no-restricted-imports`) enforces this: Mongoose is only allowed inside `server/src/infra/`.
- `server/src/container.ts` is the composition root, the single place that picks implementations. Moving to
  Postgres means a new adapter set plus one change here, and it must pass the same contract suites.
- Repositories take `userId` as a **required** parameter on every user-owned method, so tenant isolation is
  part of the interface contract, not a convention.
- `shared/` holds the Zod schemas, DTOs and SSE event types used by both client and server (consumed as
  TypeScript source through the `@shared` alias).

## RAG (policy knowledge base)

- **Content:** `server/kb/{shipping,returns,payments,warranty,account}.md`. Edit these, then run
  `npm run ingest -w server` (once per change, never per request). On startup the server also ingests
  automatically when the `kbChunks` collection is empty.
- **Pipeline:** split by heading (~200-400 tokens per chunk) → embed all chunks in batches
  (`EMBEDDING_MODEL`) → store in `kbChunks` → Atlas vector index `kb_vector_index` (cosine, 1536 dims, created
  at startup).
- **Retrieval is a tool, not on every message:** the model calls `search_policies` only for policy questions,
  next to the order tools. The tool embeds the query, runs `$vectorSearch` (`numCandidates: 50`, `limit: 4`),
  drops results under `KB_MIN_SCORE` and returns the chunks with their source names. The server then emits a
  `sources` SSE event, so the UI shows "Source: Returns and Refunds Policy" under the answer.
- **Fallback:** if `$vectorSearch` isn't available (plain MongoDB, index still building) the same code ranks the
  ~30 chunks in memory by cosine similarity. Output is identical either way.
- **No-answer behaviour:** when nothing relevant is found the assistant says it doesn't know and offers a ticket.
- With `LLM_PROVIDER=mock`, deterministic hashed bag-of-words embeddings are used, so RAG works offline.

## API

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/auth/signup` | no | 409 on duplicate email; sets the refresh cookie; seeds demo orders |
| `POST /api/auth/login` | no | Always "Invalid email or password" (constant-time against a dummy hash) |
| `POST /api/auth/refresh` | cookie | Rotates the refresh token; replaying an old one revokes the session |
| `POST /api/auth/logout` | cookie | Revokes the session, clears the cookie |
| `GET /api/auth/me` | bearer | Current user |
| `POST /api/chat/send` | bearer | `{ conversationId?, message, idempotencyKey }` → SSE stream |
| `GET /api/chat/history` | bearer | Conversations, newest first, `?cursor=&limit=20` |
| `GET /api/chat/history/:id` | bearer | Messages of one conversation (owner-checked) |
| `DELETE /api/chat/history/:id` | bearer | Delete a conversation |
| `GET /api/health` | no | Liveness + Mongo ping |

Errors are `{ "error": { "code", "message", "fields"? } }`.

## Key decisions and trade-offs

- **Access token in memory + 7-day httpOnly refresh cookie** (not localStorage) so XSS can't read a
  long-lived credential. Refresh tokens are rotated and stored only as hashes in `sessions`.
- **SSE over WebSockets**: one-way streaming, plain HTTP, works through proxies. The client uses
  `fetch` + a stream reader because `EventSource` can't `POST` or send an `Authorization` header.
- **Tools, not prompts, enforce data access.** `userId` comes from the authenticated request and never from
  model output, so prompt injection can't reach another user's data. Other users' orders return "not found".
- **Atomic business rules in the adapter, rules in the service.** Cancellation and returns use a generic
  compare-and-set (`transitionStatus`), so two concurrent requests can't both succeed.
- **Idempotency**: a unique `{userId, idempotencyKey}` index. Repeating a key replays the stored answer
  without a second LLM call; retrying after a failed reply reuses the saved user message.
- **No Redis, no nginx in v1.** The in-memory rate-limit store is fine for one instance (for several, swap in
  `rate-limit-redis`), and Express serves the built client directly: same origin, one container.
- **Return window is 10 days** from delivery (`RETURN_WINDOW_DAYS` in `order.service.ts`).

## Security and tenant isolation

helmet headers, CORS limited to `CLIENT_ORIGIN` with credentials, 16 KB body limit, Zod validation on every
route, separate JWT secrets, generic 500s in production, `.env` git-ignored. Rate limits: auth 10 / 15 min per
IP; chat 20 / min per user. After deploying, log `req.ip` once to confirm `TRUST_PROXY` shows real client IPs.

`server/tests/integration/isolation.test.ts` proves user A cannot read user B's conversations, messages or
orders through the API, the repositories **or the AI tools**.

## Testing

```bash
npm test            # server (Vitest + Supertest on mongodb-memory-server) and client (Vitest + Testing Library)
npm run lint && npm run typecheck
```

- Contract suites (`server/tests/contracts`) are written against the repository **interfaces**; any future
  adapter must pass them.
- The LLM is mocked in every automated test (`MockLlmClient`: scripted replies and tool calls).
- `e2e/chat.spec.ts` is one Playwright test (login → chat → reload → history). Run it against
  `LLM_PROVIDER=mock docker compose up` (set `LLM_PROVIDER=mock` in `server/.env`): `cd e2e && npm i && npx playwright install chromium && npm test`.
- `$vectorSearch` can't run on mongodb-memory-server, so the Atlas store's in-memory fallback path is what the
  automated tests exercise; the real `$vectorSearch` path is checked manually against Atlas.

## Deployment (free tier)

Vercel (client, `client/vercel.json` rewrites `/api/*` to Render) + Render (Docker web service, health check
`/api/health`) + MongoDB Atlas + OpenRouter. The rewrite keeps the refresh cookie first-party (Safari blocks it
otherwise). Vercel caps proxied requests at 120 s, so keep a chat turn under ~90 s. Render's free tier sleeps
after 15 min idle, so the first load may be slow. Edit the Render hostname in `client/vercel.json`.

## Known limitations and what's next

- `search_products` (optional) is not built. The relevance threshold (`KB_MIN_SCORE`) is a sensible default, not tuned on real traffic.
- Refresh-token rotation is strict: two tabs refreshing at the exact same moment can invalidate the session.
- Org-level tenancy, Redis-backed rate limits, evaluation harness, admin view for tickets and returns.
