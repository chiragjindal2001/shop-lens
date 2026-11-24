import type { LlmChatRequest, LlmChatResponse, LlmClient, LlmMessage } from '../../modules/ai/llm-client';

/**
 * Scripted client for tests, demos and CI (LLM_PROVIDER=mock). It decides tool calls from keywords in
 * the latest user message, then turns the tool result into a plain-text reply.
 */
const STOPWORDS = new Set(
  'a an and are as at be by can do does for from get how i if in is it its me my of on or our so that the their there this to us was we what when where which who will with you your'.split(' '),
);
const POLICY_WORDS =
  /\b(polic(y|ies)|ship(ping)?|deliver(y|ies)?|pin ?code|cod|cash on delivery|payments?|upi|emi|warranty|refunds?|returns?|password|address|gst|invoice|account|charges?|fee|free)\b/;

/** Deterministic hashed bag-of-words embedding: lets RAG work offline (tests, demos) with no API key. */
export function mockEmbed(text: string, dimensions: number): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  for (const raw of text.toLowerCase().match(/[a-z0-9₹]+/g) ?? []) {
    const word = raw.length > 3 && raw.endsWith('s') ? raw.slice(0, -1) : raw;
    if (STOPWORDS.has(word)) continue;
    let h = 2166136261; // FNV-1a
    for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
    vec[Math.abs(h) % dimensions]! += 1;
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((v) => v / norm);
}

export class MockLlmClient implements LlmClient {
  constructor(
    private readonly delayMs = 0,
    private readonly dimensions = 1536,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => mockEmbed(t, this.dimensions));
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    const res = await this.respond(req);
    // Rough token estimate (~4 chars/token). The mock costs nothing.
    const promptChars = req.messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
    const completionChars = res.content.length + res.toolCalls.reduce((n, c) => n + c.arguments.length, 0);
    return { ...res, usage: { promptTokens: Math.ceil(promptChars / 4), completionTokens: Math.ceil(completionChars / 4), costUsd: 0 } };
  }

  private async respond(req: LlmChatRequest): Promise<LlmChatResponse> {
    const last = req.messages[req.messages.length - 1]!;
    const userText = [...req.messages].reverse().find((m) => m.role === 'user')?.content?.toString() ?? '';

    if (last.role === 'tool') {
      return this.reply(req, summarizeTool(req.messages, last.content));
    }

    const orderNo = userText.match(/\bSE\d{3,6}\b/i)?.[0]?.toUpperCase();
    const lower = userText.toLowerCase();
    const call = (name: string, args: object): LlmChatResponse => ({
      content: '',
      model: 'mock',
      toolCalls: [{ id: `mock_${name}`, name, arguments: JSON.stringify(args) }],
    });

    if (/\bcancel\b/.test(lower) && orderNo) return call('cancel_order', { orderNumber: orderNo });
    if (/\b(return|refund)\b/.test(lower) && orderNo) return call('check_return_eligibility', { orderNumber: orderNo });
    if (/\b(human|agent|speak to someone|complaint)\b/.test(lower)) {
      return call('create_support_ticket', { summary: userText.slice(0, 200) });
    }
    if (orderNo) return call('get_order_status', { orderNumber: orderNo });
    if (POLICY_WORDS.test(lower)) return call('search_policies', { query: userText.slice(0, 300) });
    if (/\b(order|orders|where)\b/.test(lower)) return call('list_my_orders', {});

    return this.reply(req, "I'm the Shoplens Support assistant. I can help with your orders, returns and cancellations. What do you need?");
  }

  private async reply(req: LlmChatRequest, text: string): Promise<LlmChatResponse> {
    for (const part of text.match(/\S+\s*/g) ?? []) {
      if (req.signal?.aborted) throw new Error('aborted');
      if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
      req.onToken?.(part);
    }
    return { content: text, toolCalls: [], model: 'mock' };
  }
}

function summarizeTool(messages: LlmMessage[], raw: string): string {
  const name = [...messages].reverse().find((m) => m.role === 'assistant' && m.toolCalls?.length);
  const toolName = name && name.role === 'assistant' ? name.toolCalls?.[0]?.name : undefined;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return 'Sorry, something went wrong. Would you like me to create a support ticket?';
  }
  if (data.error === 'not_found') return "I couldn't find that order on your account. Could you double-check the order number?";
  if (data.error) return 'Sorry, I could not complete that. Would you like me to create a support ticket?';

  switch (toolName) {
    case 'list_my_orders':
      return `Here are your recent orders:\n${(data.orders ?? []).map((o: any) => `- ${o.orderNumber}: ${o.status} (₹${o.totalInr})`).join('\n')}`;
    case 'get_order_status': {
      const o = data.order;
      return `Order ${o.orderNumber} is ${o.status}.${o.expectedDelivery ? ` Expected delivery: ${o.expectedDelivery}.` : ''}`;
    }
    case 'check_return_eligibility':
      return data.eligible ? `Good news: ${data.reason} Want me to start the return?` : `This order can't be returned. ${data.reason}`;
    case 'cancel_order':
      return data.cancelled ? `Done, order ${data.orderNumber} has been cancelled.` : `I couldn't cancel it. ${data.reason}`;
    case 'search_policies': {
      const top = data.results?.[0];
      if (!top) return "I couldn't find that in our store policies. Would you like me to create a support ticket so a human can help?";
      const body = String(top.text).split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim();
      return `According to our ${top.source} (${top.section}): ${body.slice(0, 450)}${body.length > 450 ? '…' : ''}`;
    }
    case 'create_support_ticket':
      return `I've created ticket ${data.ticketNumber}. A human agent will follow up.`;
    default:
      return 'Done.';
  }
}
