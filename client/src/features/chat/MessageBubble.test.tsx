import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatCost, MessageBubble } from './MessageBubble';
import type { UiMessage } from './useChatStream';

const msg = (over: Partial<UiMessage> = {}): UiMessage => ({
  id: 'm1',
  conversationId: 'c1',
  role: 'assistant',
  content: 'Hello',
  toolCalls: [],
  sources: [],
  status: 'complete',
  createdAt: new Date().toISOString(),
  ...over,
});

describe('usage line (development only)', () => {
  const usage = {
    model: 'openai/gpt-4o-mini',
    promptTokens: 812,
    completionTokens: 94,
    totalTokens: 906,
    costUsd: 0.000143,
    llmCalls: 2,
  };

  it('shows tokens, cost and call count when the message carries usage', () => {
    render(<MessageBubble message={msg({ usage })} />);
    const line = screen.getByTestId('usage-line');
    expect(line).toHaveTextContent('openai/gpt-4o-mini');
    expect(line).toHaveTextContent('812 in / 94 out (906 total)');
    expect(line).toHaveTextContent('$0.000143');
    expect(line).toHaveTextContent('2 calls');
  });

  it('shows nothing when there is no usage (what production servers send)', () => {
    render(<MessageBubble message={msg()} />);
    expect(screen.queryByTestId('usage-line')).not.toBeInTheDocument();
  });

  it('formats missing, zero and larger costs', () => {
    expect(formatCost(null)).toBe('cost n/a');
    expect(formatCost(0)).toBe('$0 (free)');
    expect(formatCost(0.5)).toBe('$0.5000');
  });
});
