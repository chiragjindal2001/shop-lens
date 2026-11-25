import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chat = vi.hoisted(() => ({
  messages: [],
  streaming: false,
  loadingConversation: false,
  sendError: null,
  open: vi.fn(),
  send: vi.fn(),
  reset: vi.fn(),
  stop: vi.fn(),
  retrySendError: vi.fn(),
  retryMessage: vi.fn(),
}));

vi.mock('../chat/useChatStream', () => ({ useChatStream: () => chat }));
vi.mock('../chat/useConversations', () => ({
  useConversations: () => ({ items: [], loading: false, error: false, hasMore: false, refresh: vi.fn(), loadMore: vi.fn(), remove: vi.fn() }),
}));
vi.mock('./useOrders', () => ({ useOrders: () => ({ orders: [], loading: false, error: false, refresh: vi.fn() }) }));
vi.mock('./useProducts', () => ({ useProducts: () => ({ products: [], loading: false, error: false, reload: vi.fn() }) }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: '1', name: 'Demo User', email: 'demo@shoplens.in' }, logout: vi.fn() }) }));
// The real page content and panel are not what is being tested: stand-ins expose just the buttons that matter.
vi.mock('./Storefront', () => ({
  Storefront: ({ onAsk }: { onAsk(text: string): void }) => <button onClick={() => onAsk('Tell me about the boAt Airdopes 141 Earbuds')}>ask from the page</button>,
}));
vi.mock('../chat/AssistantPanel', () => ({
  AssistantPanel: ({ onClose }: { onClose(): void }) => <button onClick={onClose}>close the assistant</button>,
}));

import { HomePage } from './HomePage';

/** Pretends the screen is a desktop (wide) or a phone (narrow). */
function setScreen(kind: 'desktop' | 'phone') {
  window.matchMedia = ((query: string) => ({
    matches: kind === 'desktop' && query.includes('min-width: 1024px'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>,
  );
const ask = () => userEvent.click(screen.getByRole('button', { name: 'ask from the page' }));
const openAssistant = () => userEvent.click(screen.getByRole('button', { name: 'Open the Shoplens assistant' }));
const closeAssistant = () => userEvent.click(screen.getByRole('button', { name: 'close the assistant' }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('a question asked from the page on a phone', () => {
  beforeEach(() => setScreen('phone'));

  it('starts a NEW chat when the assistant slide-over was closed (this was the bug: it was added to the previous chat)', async () => {
    renderPage();
    await openAssistant();
    await closeAssistant();
    await ask();

    expect(chat.reset).toHaveBeenCalledOnce();
    expect(chat.send).toHaveBeenCalledExactlyOnceWith('Tell me about the boAt Airdopes 141 Earbuds');
    // forget the old chat first, then send, so the question goes to a fresh conversation
    expect(chat.reset.mock.invocationCallOrder[0]!).toBeLessThan(chat.send.mock.invocationCallOrder[0]!);
  });

  it('also starts a new chat when the assistant was never opened', async () => {
    renderPage();
    await ask();
    expect(chat.reset).toHaveBeenCalledOnce();
    expect(chat.send).toHaveBeenCalledOnce();
  });

  it('keeps the same chat while the assistant is open (the visitor is looking at it)', async () => {
    renderPage();
    await openAssistant();
    await ask();
    expect(chat.reset).not.toHaveBeenCalled();
    expect(chat.send).toHaveBeenCalledOnce();
  });

  it('opening the assistant from its button does not start a new chat by itself', async () => {
    renderPage();
    await openAssistant();
    expect(chat.reset).not.toHaveBeenCalled();
    expect(chat.send).not.toHaveBeenCalled();
  });
});

describe('a question asked from the page on a desktop', () => {
  beforeEach(() => setScreen('desktop'));

  it('always continues the chat: the assistant is docked beside the page and plainly visible', async () => {
    renderPage();
    await ask();
    await ask();
    expect(chat.reset).not.toHaveBeenCalled();
    expect(chat.send).toHaveBeenCalledTimes(2);
  });

  it('still continues after the (mobile-only) close state was set, because the panel never actually hides', async () => {
    renderPage();
    await closeAssistant();
    await ask();
    expect(chat.reset).not.toHaveBeenCalled();
  });
});
