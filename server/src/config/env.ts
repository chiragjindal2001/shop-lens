import { z } from 'zod';

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
  return {
    ...cfg,
    mongoUri: buildMongoUri(cfg),
    // Real embeddings score related text ~0.4+; the mock's hashed bag-of-words scores lower.
    kbMinScore: cfg.KB_MIN_SCORE ?? (cfg.LLM_PROVIDER === 'mock' ? 0.12 : 0.35),
    rateLimits: {
      auth: { windowMs: 15 * 60_000, limit: 10 },
      chat: { windowMs: 60_000, limit: 20 },
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
