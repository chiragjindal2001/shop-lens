import type { Config } from './config/env';
import { MockLlmClient } from './infra/llm/mock-client';
import { OpenRouterClient } from './infra/llm/openrouter-client';
import { pingMongo } from './infra/mongo/connection';
import { createMongoRepositories, type Repositories } from './infra/mongo';
import { Agent } from './modules/ai/agent';
import { KnowledgeService } from './modules/knowledge/knowledge.service';
import { IngestService } from './modules/knowledge/ingest.service';
import type { LlmClient } from './modules/ai/llm-client';
import { ResilientLlm } from './modules/ai/resilient-llm';
import { cancelOrderTool } from './modules/ai/tools/cancel-order.tool';
import { checkReturnEligibilityTool } from './modules/ai/tools/check-return-eligibility.tool';
import { createReturnRequestTool } from './modules/ai/tools/create-return-request.tool';
import { createSupportTicketTool } from './modules/ai/tools/create-support-ticket.tool';
import { getOrderStatusTool } from './modules/ai/tools/get-order-status.tool';
import { searchPoliciesTool } from './modules/ai/tools/search-policies.tool';
import { listMyOrdersTool } from './modules/ai/tools/list-my-orders.tool';
import { ToolRegistry } from './modules/ai/tools/registry';
import { AuthService } from './modules/auth/auth.service';
import { TokenService } from './modules/auth/token.service';
import { ChatService } from './modules/chat/chat.service';
import { OrderService } from './modules/orders/order.service';
import { TicketService } from './modules/tickets/ticket.service';

export interface Container {
  config: Config;
  tokens: TokenService;
  auth: AuthService;
  orders: OrderService;
  tickets: TicketService;
  chat: ChatService;
  ingest: IngestService;
  knowledge: Repositories['knowledge'];
  health: () => Promise<boolean>;
}

export interface ContainerOverrides {
  repos?: Repositories;
  llm?: LlmClient;
  health?: () => Promise<boolean>;
}

/**
 * Composition root: the one place that picks concrete implementations.
 * Swapping databases = a new adapter set returned here (see infra/).
 */
export function buildContainer(config: Config, overrides: ContainerOverrides = {}): Container {
  const repos = overrides.repos ?? createMongoRepositories({ embeddingDimensions: config.EMBEDDING_DIMENSIONS });

  const llm: LlmClient =
    overrides.llm ??
    (config.LLM_PROVIDER === 'mock'
      ? new MockLlmClient(0, config.EMBEDDING_DIMENSIONS)
      : new ResilientLlm(
          new OpenRouterClient({ apiKey: config.OPENROUTER_API_KEY, models: config.LLM_MODELS, embeddingModel: config.EMBEDDING_MODEL, maxTokens: config.LLM_MAX_TOKENS, referer: config.CLIENT_ORIGIN }),
        ));

  const tokens = new TokenService({ access: config.JWT_ACCESS_SECRET, refresh: config.JWT_REFRESH_SECRET });
  const orders = new OrderService(repos.orders, repos.returns);
  const tickets = new TicketService(repos.tickets);
  const auth = new AuthService(repos.users, repos.sessions, tokens, orders, config.BCRYPT_COST);

  const knowledge = new KnowledgeService(llm, repos.knowledge, config.kbMinScore);
  const ingest = new IngestService(llm, repos.knowledge, config.KB_DIR);

  const registry = new ToolRegistry([
    listMyOrdersTool(orders),
    getOrderStatusTool(orders),
    checkReturnEligibilityTool(orders),
    createReturnRequestTool(orders),
    cancelOrderTool(orders),
    createSupportTicketTool(tickets),
    searchPoliciesTool(knowledge),
  ]);
  const chat = new ChatService(repos.conversations, repos.messages, new Agent(llm, registry), config.NODE_ENV === 'development');

  return { config, tokens, auth, orders, tickets, chat, ingest, knowledge: repos.knowledge, health: overrides.health ?? pingMongo };
}
