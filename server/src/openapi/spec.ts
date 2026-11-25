import { z } from 'zod';
import { historyQuerySchema, loginSchema, sendMessageSchema, signupSchema } from '@shared';

/**
 * OpenAPI 3.1 description of the Shoplens API. Request bodies and query params are generated from the same
 * Zod schemas the routes validate with (shared/), so the docs cannot drift from the validation rules.
 */
const jsonSchemaOf = (schema: z.ZodType): Record<string, unknown> => {
  const { $schema: _omit, ...rest } = z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
  return rest;
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: unknown, example?: unknown) => ({
  'application/json': { schema, ...(example === undefined ? {} : { example }) },
});

const error = (description: string, code: string, message: string, fields?: Record<string, string>) => ({
  description,
  content: json(ref('ApiError'), { error: { code, message, ...(fields ? { fields } : {}) } }),
});

const unauthorized = error('Missing, invalid or expired access token', 'UNAUTHORIZED', 'Authentication required');
const rateLimited = error('Too many requests', 'RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.');
const validation = error('Validation failed', 'VALIDATION_ERROR', 'Please check the highlighted fields', {
  email: 'Enter a valid email address',
});

const bearer = [{ bearerAuth: [] }];
const conversationIdParam = {
  name: 'conversationId',
  in: 'path',
  required: true,
  description: 'Conversation id returned in the `meta` event of `/chat/send` or by `/chat/history`.',
  schema: { type: 'string', example: '6b055fbec318669d18191ffb' },
};

const queryProps = (jsonSchemaOf(historyQuerySchema).properties ?? {}) as Record<string, unknown>;

const authExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
  user: { id: '6b055e35a7e24416e0fd8540', name: 'Demo User', email: 'demo@shoplens.in' },
};

const sseDescription = [
  'Sends a message and streams the assistant reply as **Server-Sent Events** (`text/event-stream`).',
  '',
  'Errors that happen *before* the stream opens (validation, unknown conversation, auth, rate limit) are normal JSON responses.',
  'Once the stream is open, failures arrive as an `error` event.',
  '',
  '| Event | Data | Meaning |',
  '|---|---|---|',
  '| `meta` | `{conversationId, messageId}` | First event. Use `conversationId` for the next message. |',
  '| `tool` | `{name, label}` | The assistant is running a tool, e.g. "Checking your orders…". |',
  '| `token` | `{text}` | A piece of the reply text. |',
  '| `sources` | `{sources:[{source, section}]}` | Policy documents the answer came from (RAG). |',
  '| `usage` | token usage and cost | **Development mode only.** Never sent in production. |',
  '| `done` | `{messageId}` | The reply is complete and saved. |',
  '| `error` | `{message, retryable}` | The reply failed; retry with the same `idempotencyKey`. |',
  '',
  '**Idempotency:** repeating a request with the same `idempotencyKey` never creates a second user message or a second model call. An already-answered key replays the stored reply.',
  '',
  'Swagger UI shows the stream only after it finishes. Use a terminal (`curl -N`) or the Postman collection to watch it live.',
].join('\n');

const sseExample = [
  'event: meta',
  'data: {"conversationId":"6b055fbec318669d18191ffb","messageId":"6b055fbec318669d18191ffc"}',
  '',
  'event: tool',
  'data: {"name":"search_policies","label":"Searching our policies…"}',
  '',
  'event: token',
  'data: {"text":"Yes, cash on delivery is available "}',
  '',
  'event: token',
  'data: {"text":"for orders up to ₹20,000."}',
  '',
  'event: sources',
  'data: {"sources":[{"source":"Payments Policy","section":"Cash on delivery"}]}',
  '',
  'event: done',
  'data: {"messageId":"6b055fbec318669d18191ffc"}',
  '',
  '',
].join('\n');

export function buildOpenApiSpec(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Shoplens API',
      version: '1.0.0',
      description: [
        'API for **Shoplens**, an AI customer-support assistant for an online electronics store.',
        '',
        '**Quick start:** call `POST /auth/login` (demo account: `demo@shoplens.in` / `Demo@1234`), copy the `accessToken`,',
        'press **Authorize** and paste it. Access tokens are short-lived (15 minutes by default, `ACCESS_TOKEN_TTL`);',
        '`POST /auth/refresh` issues a new one from the httpOnly refresh cookie (valid 7 days by default, `REFRESH_TOKEN_TTL`).',
      ].join('\n'),
    },
    servers: [{ url: '/api', description: 'This server' }],
    tags: [
      { name: 'Auth', description: 'Signup, login, token refresh and logout' },
      { name: 'Chat', description: 'Streaming chat and per-user conversation history' },
      { name: 'Products', description: 'The demo product catalog shown on the home page' },
      { name: 'Orders', description: "The logged-in customer's orders (read-only; the assistant acts on them)" },
      { name: 'System', description: 'Health check' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          operationId: 'health',
          summary: 'Liveness and database connectivity',
          responses: {
            200: { description: 'Healthy', content: json(ref('HealthResponse'), { status: 'ok', db: true }) },
            503: { description: 'Database unreachable', content: json(ref('HealthResponse'), { status: 'degraded', db: false }) },
          },
        },
      },
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          operationId: 'signup',
          summary: 'Create an account',
          description:
            'Hashes the password (bcrypt), creates the user, seeds four sample orders, returns an access token and sets the `refresh_token` httpOnly cookie. Rate limited per IP.',
          requestBody: {
            required: true,
            content: json(ref('SignupRequest'), { name: 'Asha', email: 'asha@example.com', password: 'Passw0rd!x' }),
          },
          responses: {
            201: { description: 'Account created', content: json(ref('AuthResponse'), authExample) },
            400: validation,
            409: error('Email already registered', 'EMAIL_TAKEN', 'An account with this email already exists'),
            429: rateLimited,
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          operationId: 'login',
          summary: 'Log in',
          description:
            'Always answers "Invalid email or password" for a wrong password or an unknown email (constant-time check). Rate limited per IP.',
          requestBody: { required: true, content: json(ref('LoginRequest'), { email: 'demo@shoplens.in', password: 'Demo@1234' }) },
          responses: {
            200: { description: 'Logged in', content: json(ref('AuthResponse'), authExample) },
            400: validation,
            401: error('Wrong credentials', 'UNAUTHORIZED', 'Invalid email or password'),
            429: rateLimited,
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          operationId: 'refresh',
          summary: 'Get a new access token',
          description:
            'Reads the `refresh_token` cookie, rotates it and returns a new access token. Replaying an already-used refresh token revokes the whole session.',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'New access token (and a rotated refresh cookie)', content: json(ref('AuthResponse'), authExample) },
            401: error('No cookie, or the session is expired or revoked', 'UNAUTHORIZED', 'Session expired'),
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          operationId: 'logout',
          summary: 'Log out',
          description: 'Revokes the session server-side and clears the refresh cookie. Always succeeds.',
          security: [{ cookieAuth: [] }],
          responses: { 204: { description: 'Logged out' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          operationId: 'me',
          summary: 'Current user',
          security: bearer,
          responses: {
            200: { description: 'The logged-in user', content: json({ type: 'object', properties: { user: ref('UserDto') } }, { user: authExample.user }) },
            401: unauthorized,
          },
        },
      },
      '/products': {
        get: {
          tags: ['Products'],
          operationId: 'listProducts',
          summary: 'The product catalog',
          description:
            'The demo catalog. The home page and the assistant (its `search_products` tool) read the same data, so what you see here is what the assistant tells customers.',
          security: bearer,
          responses: {
            200: {
              description: 'All products',
              content: json(ref('ProductsResponse'), {
                products: [
                  {
                    id: 'airdopes-141',
                    name: 'boAt Airdopes 141 Earbuds',
                    category: 'Earbuds',
                    tagline: '42-hour playback with ENx noise cancellation.',
                    description: 'True wireless earbuds built for long days…',
                    price: 1499,
                    features: ['Up to 42 hours of total playback with the case', 'Bluetooth 5.1'],
                    warranty: '1 year',
                    freeShipping: true,
                  },
                ],
              }),
            },
            401: unauthorized,
          },
        },
      },
      '/orders': {
        get: {
          tags: ['Orders'],
          operationId: 'listOrders',
          summary: 'Your recent orders (newest first)',
          description:
            'Returns the logged-in customer\'s ten most recent orders. Read-only: cancelling or returning an order is done through the chat assistant. Other customers\' orders are never visible.',
          security: bearer,
          responses: {
            200: {
              description: 'The customer\'s orders',
              content: json(ref('OrdersResponse'), {
                orders: [
                  {
                    orderNumber: 'SE1041',
                    status: 'shipped',
                    items: [{ name: 'Mi Power Bank 20000mAh', quantity: 1, price: 1799 }],
                    total: 1799,
                    placedAt: '2026-11-21T10:00:00.000Z',
                    expectedDeliveryAt: '2026-11-26T10:00:00.000Z',
                    deliveredAt: null,
                  },
                ],
              }),
            },
            401: unauthorized,
          },
        },
      },
      '/chat/send': {
        post: {
          tags: ['Chat'],
          operationId: 'sendMessage',
          summary: 'Send a message (streams the reply)',
          description: sseDescription,
          security: bearer,
          requestBody: {
            required: true,
            content: json(ref('SendMessageRequest'), {
              message: 'Is cash on delivery available?',
              idempotencyKey: '5b0c7f4e-9d52-4c3e-8d57-3a3f5a8a1e11',
            }),
          },
          responses: {
            200: {
              description: 'Server-Sent Events stream',
              content: { 'text/event-stream': { schema: { type: 'string' }, example: sseExample } },
            },
            400: error('Empty or over-long message, or a malformed body', 'VALIDATION_ERROR', 'Please check the highlighted fields', {
              message: 'Message is required',
            }),
            401: unauthorized,
            404: error('`conversationId` does not exist for this user', 'NOT_FOUND', 'Conversation not found'),
            409: error('The same `idempotencyKey` is already being processed', 'IN_PROGRESS', 'This message is already being processed'),
            429: rateLimited,
          },
        },
      },
      '/chat/history': {
        get: {
          tags: ['Chat'],
          operationId: 'listConversations',
          summary: 'List your conversations (newest first)',
          security: bearer,
          parameters: [
            { name: 'cursor', in: 'query', required: false, description: 'Opaque cursor from the previous page (`nextCursor`).', schema: queryProps.cursor },
            { name: 'limit', in: 'query', required: false, description: 'Page size.', schema: queryProps.limit },
          ],
          responses: {
            200: {
              description: 'One page of conversations',
              content: json(ref('HistoryResponse'), {
                conversations: [
                  { id: '6b055fbec318669d18191ffb', title: 'Is cash on delivery available?', createdAt: '2026-11-24T10:00:00.000Z', updatedAt: '2026-11-24T10:00:05.000Z' },
                ],
                nextCursor: null,
              }),
            },
            400: error('Invalid query', 'VALIDATION_ERROR', 'Invalid query'),
            401: unauthorized,
          },
        },
      },
      '/chat/history/{conversationId}': {
        get: {
          tags: ['Chat'],
          operationId: 'getConversation',
          summary: 'Messages of one conversation',
          description: "Only the owner can read a conversation. Someone else's conversation looks exactly like a missing one (404).",
          security: bearer,
          parameters: [conversationIdParam],
          responses: {
            200: { description: 'The conversation and its messages', content: json(ref('ConversationResponse')) },
            401: unauthorized,
            404: error('Not found (or not yours)', 'NOT_FOUND', 'Conversation not found'),
          },
        },
        delete: {
          tags: ['Chat'],
          operationId: 'deleteConversation',
          summary: 'Delete a conversation',
          security: bearer,
          parameters: [conversationIdParam],
          responses: {
            204: { description: 'Deleted' },
            401: unauthorized,
            404: error('Not found (or not yours)', 'NOT_FOUND', 'Conversation not found'),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from `/auth/login`, `/auth/signup` or `/auth/refresh` (short-lived, 15 minutes by default).',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refresh_token',
          description: 'httpOnly refresh cookie set by login/signup. The browser sends it automatically on the same origin.',
        },
      },
      schemas: {
        // Generated from the Zod schemas the routes validate with.
        SignupRequest: jsonSchemaOf(signupSchema),
        LoginRequest: jsonSchemaOf(loginSchema),
        SendMessageRequest: jsonSchemaOf(sendMessageSchema),

        UserDto: {
          type: 'object',
          required: ['id', 'name', 'email'],
          properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' } },
        },
        AuthResponse: {
          type: 'object',
          required: ['accessToken', 'user'],
          properties: { accessToken: { type: 'string', description: 'JWT, short-lived (15 minutes by default)' }, user: ref('UserDto') },
        },
        ConversationDto: {
          type: 'object',
          required: ['id', 'title', 'createdAt', 'updatedAt'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string', description: 'First user message, trimmed to ~60 characters' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SourceRef: {
          type: 'object',
          required: ['source'],
          properties: { source: { type: 'string', example: 'Returns and Refunds Policy' }, section: { type: 'string', example: 'Return window' } },
        },
        ToolCallRecord: {
          type: 'object',
          required: ['name', 'args', 'ok'],
          properties: { name: { type: 'string', example: 'get_order_status' }, args: {}, ok: { type: 'boolean' } },
        },
        UsageDto: {
          type: 'object',
          description: 'Token usage and cost for one reply. Present only when the server runs in development mode.',
          required: ['model', 'promptTokens', 'completionTokens', 'totalTokens', 'costUsd', 'llmCalls'],
          properties: {
            model: { type: 'string' },
            promptTokens: { type: 'integer' },
            completionTokens: { type: 'integer' },
            totalTokens: { type: 'integer' },
            costUsd: { type: ['number', 'null'], description: 'USD as reported by OpenRouter; null if not reported' },
            llmCalls: { type: 'integer', description: 'Model calls behind this reply (2+ when a tool was used)' },
          },
        },
        MessageDto: {
          type: 'object',
          required: ['id', 'conversationId', 'role', 'content', 'toolCalls', 'sources', 'status', 'createdAt'],
          properties: {
            id: { type: 'string' },
            conversationId: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant'] },
            content: { type: 'string' },
            toolCalls: { type: 'array', items: ref('ToolCallRecord') },
            sources: { type: 'array', items: ref('SourceRef') },
            status: { type: 'string', enum: ['complete', 'partial', 'error'], description: '`partial` = the stream was cut off; `error` = nothing was generated' },
            idempotencyKey: { type: 'string', description: 'User messages only' },
            usage: ref('UsageDto'),
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        HistoryResponse: {
          type: 'object',
          required: ['conversations', 'nextCursor'],
          properties: {
            conversations: { type: 'array', items: ref('ConversationDto') },
            nextCursor: { type: ['string', 'null'], description: 'Pass as `cursor` for the next page; null on the last page' },
          },
        },
        ConversationResponse: {
          type: 'object',
          required: ['conversation', 'messages'],
          properties: { conversation: ref('ConversationDto'), messages: { type: 'array', items: ref('MessageDto') } },
        },
        ProductDto: {
          type: 'object',
          required: ['id', 'name', 'category', 'tagline', 'description', 'price', 'features', 'warranty', 'freeShipping'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            tagline: { type: 'string', description: 'One line for the product card' },
            description: { type: 'string' },
            price: { type: 'integer', description: 'INR, whole rupees' },
            features: { type: 'array', items: { type: 'string' } },
            warranty: { type: 'string', example: '1 year' },
            freeShipping: { type: 'boolean', description: 'Free shipping applies from ₹499' },
          },
        },
        ProductsResponse: {
          type: 'object',
          required: ['products'],
          properties: { products: { type: 'array', items: ref('ProductDto') } },
        },
        OrderItemDto: {
          type: 'object',
          required: ['name', 'quantity', 'price'],
          properties: {
            name: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'integer', description: 'INR, whole rupees' },
          },
        },
        OrderDto: {
          type: 'object',
          required: ['orderNumber', 'status', 'items', 'total', 'placedAt', 'expectedDeliveryAt', 'deliveredAt'],
          properties: {
            orderNumber: { type: 'string', example: 'SE1042' },
            status: { type: 'string', enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested'] },
            items: { type: 'array', items: ref('OrderItemDto') },
            total: { type: 'integer', description: 'INR, whole rupees' },
            placedAt: { type: 'string', format: 'date-time' },
            expectedDeliveryAt: { type: ['string', 'null'], format: 'date-time' },
            deliveredAt: { type: ['string', 'null'], format: 'date-time' },
          },
        },
        OrdersResponse: {
          type: 'object',
          required: ['orders'],
          properties: { orders: { type: 'array', items: ref('OrderDto') } },
        },
        HealthResponse: {
          type: 'object',
          required: ['status', 'db'],
          properties: { status: { type: 'string', enum: ['ok', 'degraded'] }, db: { type: 'boolean' } },
        },
        ApiError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                fields: { type: 'object', additionalProperties: { type: 'string' }, description: 'Per-field messages for validation errors' },
              },
            },
          },
        },
      },
    },
  };
}
