import { z } from 'zod';
import { parseDurationSeconds } from '../lib/duration';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_HOST: z.string().min(1, 'MONGO_HOST is required'),
  MONGO_PORT: z.coerce.number().int().positive().default(27017),
  MONGO_DB_NAME: z.string().min(1, 'MONGO_DB_NAME is required'),
  MONGO_USER: z.string().default(''),
  MONGO_PASSWORD: z.string().default(''),
  /** Database that holds the MONGO_USER credentials (Atlas: "admin"). Only used when MONGO_USER is set. */
  MONGO_AUTH_SOURCE: z.string().default('admin'),
  /** "true" for Atlas mongodb+srv:// hosts (the port is then ignored). */
  MONGO_SRV: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  /** Extra query-string options, e.g. "directConnection=true" (local atlas image) or "retryWrites=true&w=majority". */
  MONGO_OPTIONS: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  /** How long an access token is valid, e.g. 15m, 1h. Allowed: 1m to 1d. */
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  /** How long a refresh token (the login session) lasts without use, e.g. 7d, 30d. Allowed: up to 90d. */
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  OPENROUTER_API_KEY: z.string().default(''),
  LLM_MODELS: z
    .string()
    .default('openai/gpt-oss-20b:free')
    .transform((s) => s.split(',').map((m) => m.trim()).filter(Boolean)),
  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  /** Must match the model (text-embedding-3-small = 1536) and the Atlas vector index. */
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  /** Minimum cosine similarity (-1..1) for a chunk to count as relevant. Default depends on the provider. */
  KB_MIN_SCORE: z.coerce.number().min(-1).max(1).optional(),
  /** Folder with the Markdown knowledge base. Default: ./kb or ./server/kb. */
  KB_DIR: z.string().optional(),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  LLM_PROVIDER: z.enum(['openrouter', 'mock']).default('openrouter'),
  /** Rate limits. Windows are durations like 1m or 15m. */
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_AUTH_WINDOW: z.string().default('15m'),
  RATE_LIMIT_CHAT_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_CHAT_WINDOW: z.string().default('1m'),
  /** How much recent chat history is sent to the model on every call. */
  HISTORY_MAX_MESSAGES: z.coerce.number().int().min(1).max(50).default(10),
  HISTORY_MAX_CHARS: z.coerce.number().int().min(500).max(100_000).default(12_000),
  /** Max tool-calling rounds the agent may run per reply. */
  MAX_TOOL_ROUNDS: z.coerce.number().int().min(1).max(10).default(4),
  /** Silence allowed from the model before a call is cancelled and retried (e.g. 30s). */
  LLM_TIMEOUT: z.string().default('30s'),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  /** Upper bound on output tokens per model call (output tokens cost the most). */
  LLM_MAX_TOKENS: z.coerce.number().int().min(1).default(500),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  CLIENT_DIST: z.string().optional(),
  /** Defaults to true in production. Set false only for plain-http deployments (e.g. local docker compose). */
  COOKIE_SECURE: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
});

export type Config = z.infer<typeof envSchema> & {
  /** Assembled from the MONGO_* variables. Contains the password: never log it. */
  mongoUri: string;
  /** Effective relevance threshold for search_policies. */
  kbMinScore: number;
  /** ACCESS_TOKEN_TTL in seconds. */
  accessTokenTtlSeconds: number;
  /** REFRESH_TOKEN_TTL in seconds. */
  refreshTokenTtlSeconds: number;
  /** LLM_TIMEOUT in milliseconds. */
  llmTimeoutMs: number;
  rateLimits: {
    auth: { windowMs: number; limit: number };
    chat: { windowMs: number; limit: number };
  };
};

/** Fail-fast config: throws with a readable message when the environment is invalid. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // `KEY=` with nothing after it (common in .env files) means "not set", so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const cfg = parsed.data;
  if (cfg.LLM_PROVIDER === 'openrouter' && !cfg.OPENROUTER_API_KEY && cfg.NODE_ENV !== 'test') {
    throw new Error('Invalid environment configuration:\n  - OPENROUTER_API_KEY is required unless LLM_PROVIDER=mock');
  }
  const accessTtl = parseDurationSeconds(cfg.ACCESS_TOKEN_TTL);
  const refreshTtl = parseDurationSeconds(cfg.REFRESH_TOKEN_TTL);
  const configProblems: string[] = [];
  const windowSeconds = (name: string, value: string): number => {
    const seconds = parseDurationSeconds(value);
    if (seconds === null || seconds < 1 || seconds > 86_400) {
      configProblems.push(name + ' must look like 30s, 15m or 1h (at most 1d)');
      return 0;
    }
    return seconds;
  };
  const authWindow = windowSeconds('RATE_LIMIT_AUTH_WINDOW', cfg.RATE_LIMIT_AUTH_WINDOW);
  const chatWindow = windowSeconds('RATE_LIMIT_CHAT_WINDOW', cfg.RATE_LIMIT_CHAT_WINDOW);
  const llmTimeout = parseDurationSeconds(cfg.LLM_TIMEOUT);
  if (llmTimeout === null || llmTimeout < 5 || llmTimeout > 300) configProblems.push('LLM_TIMEOUT must look like 30s or 2m (between 5s and 5m)');
  if (accessTtl === null) configProblems.push('ACCESS_TOKEN_TTL must look like 30m, 1h or 1d');
  else if (accessTtl < 60 || accessTtl > 86_400) configProblems.push('ACCESS_TOKEN_TTL must be between 1m and 1d');
  if (refreshTtl === null) configProblems.push('REFRESH_TOKEN_TTL must look like 12h, 7d or 30d');
  else if (refreshTtl > 90 * 86_400) configProblems.push('REFRESH_TOKEN_TTL must be at most 90d');
  else if (accessTtl !== null && refreshTtl < accessTtl) configProblems.push('REFRESH_TOKEN_TTL must not be shorter than ACCESS_TOKEN_TTL');
  if (configProblems.length > 0) {
    throw new Error('Invalid environment configuration:\n' + configProblems.map((p) => '  - ' + p).join('\n'));
  }

  return {
    ...cfg,
    llmTimeoutMs: (llmTimeout ?? 30) * 1000,
    accessTokenTtlSeconds: accessTtl!,
    refreshTokenTtlSeconds: refreshTtl!,
    mongoUri: buildMongoUri(cfg),
    // Real embeddings score related text ~0.4+; the mock's hashed bag-of-words scores lower.
    kbMinScore: cfg.KB_MIN_SCORE ?? (cfg.LLM_PROVIDER === 'mock' ? 0.12 : 0.35),
    rateLimits: {
      auth: { windowMs: authWindow * 1000, limit: cfg.RATE_LIMIT_AUTH_MAX },
      chat: { windowMs: chatWindow * 1000, limit: cfg.RATE_LIMIT_CHAT_MAX },
    },
  };
}

/** Builds the connection string from separate parts so each can be set (and rotated) on its own. */
export function buildMongoUri(c: {
  MONGO_HOST: string;
  MONGO_PORT: number;
  MONGO_DB_NAME: string;
  MONGO_USER: string;
  MONGO_PASSWORD: string;
  MONGO_AUTH_SOURCE: string;
  MONGO_SRV: boolean;
  MONGO_OPTIONS: string;
}): string {
  const scheme = c.MONGO_SRV ? 'mongodb+srv' : 'mongodb';
  const creds = c.MONGO_USER ? `${encodeURIComponent(c.MONGO_USER)}:${encodeURIComponent(c.MONGO_PASSWORD)}@` : '';
  const host = c.MONGO_SRV ? c.MONGO_HOST : `${c.MONGO_HOST}:${c.MONGO_PORT}`;
  const params = new URLSearchParams(c.MONGO_OPTIONS.replace(/^\?/, ''));
  if (c.MONGO_USER && !params.has('authSource')) params.set('authSource', c.MONGO_AUTH_SOURCE);
  const query = params.toString();
  return `${scheme}://${creds}${host}/${encodeURIComponent(c.MONGO_DB_NAME)}${query ? `?${query}` : ''}`;
}
