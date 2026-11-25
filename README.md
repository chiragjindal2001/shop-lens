# Shoplens

**Shoplens is an AI customer-support assistant for an online electronics store in India.**

Customers sign up, open a chat and ask questions in plain language. The assistant:

- **Answers store-policy questions using RAG** (retrieval-augmented generation): shipping, returns and refunds, payments and COD, warranty and account help are answered from the store's own policy documents, found by vector search in MongoDB Atlas. Each answer shows which document it came from.
- **Looks up and acts on the customer's own orders**: order status, return eligibility, starting a return, cancelling an order.
- **Hands off to a human** by creating a support ticket with a ticket number.
- **Streams replies** word by word, and keeps every customer's chat history private to them.

It stays on store topics, never shows one customer's orders to another, and says "I don't know" instead of guessing.

**Demo login:** `demo@shoplens.in` / `Demo@1234` (or press **Try the demo account** on the login page). Every new account also gets four sample orders.

## What you'll see

- **Home page (left):** a Shoplens storefront with a hero, quick-question cards (is shipping free? what's the return policy?
  is COD available? what warranty do products have?), **your recent orders**, popular products and popular questions. Every button that says
  "Track", "Return", "Ask about this" or shows a question simply asks the assistant for you. Cancelling an order
  needs a second, explicit click.
- **AI assistant (right panel):** the chat lives beside the page, with a **History** button for past
  conversations and **New chat**. On a phone it becomes a slide-over opened from the "Ask Shoplens" button.
- **Resizable assistant:** drag the divider between the page and the assistant (or focus it and use the arrow
  keys; Home/End for min/max). Double-click resets it, and your width is remembered.
- **Helpful details:** hover any icon (for example the clock) for a label, and every clickable element shows the pointer cursor.
- **Light and dark themes:** the sun/moon button in the top bar cycles light, dark and follow-the-system.
- **Sign-in screens:** a one-click **Try the demo account** button (also on the signup page), a preview of the assistant
  answering a question, and inline validation. If the server is waking up from sleep on free hosting, the button says
  "Waking up the server, this can take up to a minute…" instead of showing a silent spinner.
- **Fast by design:** screens are code-split, the markdown renderer loads on demand, streamed text is applied
  once per animation frame, and the app uses system fonts and inline icons (no web-font or icon downloads).

## Setup

You need **Node 24+**, a **MongoDB Atlas** cluster (the free tier works) and an **OpenRouter** API key.

### 1. Configure

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `server/.env`:

| Variable | What to put |
|---|---|
| `MONGO_SRV` | `true` for Atlas |
| `MONGO_HOST` | Your cluster host, e.g. `my-cluster.abc12.mongodb.net` |
| `MONGO_DB_NAME` | `shoplens` (created automatically) |
| `MONGO_USER`, `MONGO_PASSWORD` | A database user from Atlas **Database Access** (not your Atlas login) |
| `MONGO_OPTIONS` | `retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different random strings, 32+ chars (`openssl rand -base64 48`) |
| `OPENROUTER_API_KEY` | Your OpenRouter key (needs a little credit for embeddings and chat) |
| `LLM_MODELS` | e.g. `openai/gpt-4o-mini,google/gemini-2.0-flash-001` (first is primary, the rest are fallbacks) |

Leave `MONGO_PORT` out (Atlas doesn't use one). In Atlas, add your IP under **Network Access**.
No API key yet? Set `LLM_PROVIDER=mock` to try the app with scripted replies.

Optional settings in `server/.env` (defaults in brackets):

| Variable | Meaning |
|---|---|
| `LLM_PROVIDER` | `openrouter` (default) or `mock` (scripted replies, no key needed) |
| `CLIENT_ORIGIN` | The browser origin the API allows (`http://localhost:5173`). Set it to your site's URL when deployed |
| `ACCESS_TOKEN_TTL` | How long an access token is valid, e.g. `15m`, `1h` (`15m`; allowed 1m to 1d) |
| `REFRESH_TOKEN_TTL` | How long a login lasts without use, e.g. `7d`, `30d` (`7d`; up to 90d). Each use renews it |
| `LLM_MAX_TOKENS` | Max output tokens per model call (`500`) |
| `KB_MIN_SCORE` | Relevance threshold for policy search, -1 to 1 (`0.35`) |
| `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` | Embedding model and its vector size (`openai/text-embedding-3-small`, `1536`) |
| `BCRYPT_COST` | Password hashing cost (`12`) |
| `API_DOCS` | Serve Swagger UI at `/api/docs` (on in dev, off in production) |
| `TRUST_PROXY` | Number of proxies in front of the server (`0`; use `1` behind Render) |
| `COOKIE_SECURE` | Secure refresh cookie (on in production; set `false` for plain http) |
| `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW` | Login/signup attempts per IP per window (`10`, `15m`) |
| `RATE_LIMIT_CHAT_MAX`, `RATE_LIMIT_CHAT_WINDOW` | Chat messages per user per window (`20`, `1m`) |
| `HISTORY_MAX_MESSAGES`, `HISTORY_MAX_CHARS` | Recent chat history sent to the model on each call (`10` messages, `12000` characters). Lower = cheaper, but the assistant remembers less |
| `MAX_TOOL_ROUNDS` | Max tool-calling rounds per reply (`4`) |
| `LLM_TIMEOUT`, `LLM_MAX_RETRIES` | Silence allowed from the model before a call is cancelled and retried, and how many retries (`30s`, `2`) |

### 2. Run

```bash
npm run dev:server     # API on http://localhost:4000
npm run dev:client     # UI  on http://localhost:5173  ← open this
```

On first start the server creates the indexes, seeds the demo user, loads the policy documents
(`server/kb/*.md`) into Atlas as vectors and creates the vector index (about a minute to become active).
Look for `bootstrap complete` and `server listening` in the log.

In dev mode each reply also shows its token usage and cost under the message. That line is never shown in production.

### How policy answers work (RAG) and how to change the documents

RAG is implemented end to end:

1. The policy documents are Markdown files in `server/kb/` (`shipping.md`, `returns.md`, `payments.md`,
   `warranty.md`, `account.md`).
2. They are split by heading into chunks, turned into embeddings (`EMBEDDING_MODEL`) and stored in the
   `kbChunks` collection in Atlas, behind the vector index `kb_vector_index`.
3. When a customer asks a policy question, the assistant searches that index, gets the most relevant
   passages and answers only from them. If nothing relevant is found, it says it doesn't know and offers a
   support ticket.

To change what the assistant knows, edit or add `.md` files in `server/kb/` (use a `# Title` and `## Section`
headings), then re-ingest:

```bash
npm run ingest -w server
```

Re-ingesting replaces all chunks and calls the embedding model again (a fraction of a cent). The server also
ingests automatically on startup if `kbChunks` is empty. Customers can't upload documents through the app yet.

### Or run with Docker

```bash
docker compose up --build     # UI + API on http://localhost:8080
```

Docker uses the same `server/.env` and connects to your Atlas cluster.

### Deploy on Render

The same Docker image runs on [Render](https://render.com). Create a **Web Service** from this repo with runtime **Docker**
(it uses the root `Dockerfile`) and set:

- **Environment variables:** the same keys as `server/.env`, plus `NODE_ENV=production`,
  `CLIENT_ORIGIN=https://<your-service>.onrender.com` and `TRUST_PROXY=1`. Render provides `PORT` itself.
- **Health check path:** `/api/health`
- **MongoDB Atlas:** under **Network Access**, allow Render to connect. Free instances have no fixed outbound IPs, so
  `0.0.0.0/0` is the practical choice (the database user's password is what protects the data).
- **Optional:** `API_DOCS=true` exposes Swagger UI at `/api/docs`.

The server also serves the built client, so there is a single URL and the refresh cookie stays first-party. Free
instances sleep when idle: the first request can take up to a minute, and the sign-in screen explains the wait.

### API docs (Swagger) and Postman

- **Swagger UI:** with the server running, open **http://localhost:4000/api/docs** (or `http://localhost:5173/api/docs`
  through the Vite dev server, or `http://localhost:8080/api/docs` in Docker). Call `POST /auth/login` with the demo
  account, copy the `accessToken`, press **Authorize** and paste it, then try any endpoint. The raw OpenAPI 3.1 document
  is at `/api/openapi.json`. Request schemas are generated from the same Zod schemas the API validates with.
- **Postman:** import `docs/postman/shoplens.postman_collection.json` and `docs/postman/shoplens.postman_environment.json`,
  select the **Shoplens - Local** environment, and run **Auth > Login (demo account)**. The collection saves your access
  token and conversation id automatically, so you can then run the **Chat** requests in order. To point it at Docker,
  change `baseUrl` to `http://localhost:8080/api`.
- Swagger UI is on by default in development and **off in production**. Set `API_DOCS=true` to turn it on there
  (the Docker setup does this for local use).

### Tests

```bash
npm test                      # server (in-memory MongoDB, mocked LLM) and client
npm run lint && npm run typecheck
```

There is also one Playwright end-to-end test in `e2e/` (login, ask the assistant, reload, find it in History). It runs
against the Docker setup with `LLM_PROVIDER=mock` in `server/.env`:

```bash
docker compose up --build -d
cd e2e && npm install && npx playwright install chromium && npm test
```

## Sample inputs

Log in as the demo user and try these. The demo account has four orders:

| Order | Item | Status |
|---|---|---|
| `SE1042` | boAt Airdopes 141 Earbuds + USB-C cable | Delivered 4 days ago (returnable) |
| `SE1041` | Mi Power Bank 20000mAh | Shipped (cannot be cancelled) |
| `SE1040` | Logitech M331 Silent Mouse | Packed (can be cancelled) |
| `SE1039` | Noise ColorFit Smartwatch | Delivered 40 days ago (return window over) |

Order dates are set when an account is created, so the demo account's `SE1042` stops being returnable 10 days
after the server first started. A brand-new signup always gets fresh sample orders.

**Your orders**
- `Where's my latest order?`
- `Show my recent orders`
- `Where is order SE1041?`

**Products** (answers come from the product catalog, with a "Source: Product catalog" tag; the product cards' "Ask about this" buttons ask the first of these)
- `Tell me about the boAt Airdopes 141 Earbuds`
- `What earbuds do you have?`
- `Show me something under ₹1,000`
- `Tell me about the Sony WH-1000XM5` → "not in our catalog" (it never invents products)

**Returns and cancellations**
- `Can I return my earbuds (SE1042)?` → eligible, within the 10-day window
- `I want to return SE1039` → refused, outside the window
- `Cancel order SE1040` → works, the order is only packed
- `Cancel order SE1041` → refused, already shipped

**Store policy questions** (answers show a "Source: …" tag)
- `What's your return policy?`
- `Is cash on delivery available?`
- `Do you deliver to Panipat? Is shipping free?`
- `What is the warranty on headphones?`
- `Money was deducted but my payment failed`
- `How do I reset my password?`

**Escalation**
- `I want to speak to a human` → creates a support ticket and shares its number

**Things it should refuse or handle carefully**
- `Where is order SE9999?` → "couldn't find that order" (it never reveals other people's orders)
- `Who won the cricket world cup?` → politely steers back to store topics
- `Return my smartwatch SE1039 anyway` → explains the policy and offers a ticket instead of promising an exception
- `My card number is 4111 1111 1111 1111` → told not to share card details, and it is not repeated back
