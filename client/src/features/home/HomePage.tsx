import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/icons';
import { useAuth } from '../auth/AuthProvider';
import { AssistantPanel } from '../chat/AssistantPanel';
import { useChatStream } from '../chat/useChatStream';
import { useConversations } from '../chat/useConversations';
import { changesOrders } from './orderTools';
import { ResizeHandle } from './ResizeHandle';
import { Storefront } from './Storefront';
import { useOrders } from './useOrders';
import { useProducts } from './useProducts';
import { useIsDesktop } from './useIsDesktop';
import { useResizablePanel } from './useResizablePanel';

/**
 * The home page: a Shoplens storefront on the left and the AI assistant docked on the right.
 * Below the `lg` breakpoint the assistant becomes a slide-over opened from a floating button.
 * The open conversation lives in the URL (?chat=<id>), so a reload or a shared link restores it.
 */
export function HomePage() {
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const chatId = params.get('chat') ?? undefined;
  const [assistantOpen, setAssistantOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const conversations = useConversations();
  const orders = useOrders();
  const catalog = useProducts();
  const panel = useResizablePanel();
  const { refresh: refreshConversations } = conversations;
  const { refresh: refreshOrders } = orders;

  const chat = useChatStream({
    onConversationCreated: (id) => setParams({ chat: id }, { replace: true }),
    onTurnFinished: ({ toolsUsed }) => {
      void refreshConversations();
      // Only a cancel or a return changes an order, so only then is the list reloaded (one request saved per message).
      if (changesOrders(toolsUsed)) void refreshOrders();
    },
    onNotFound: () => setParams({}, { replace: true }),
  });
  const { open, send, reset } = chat;
  const isDesktop = useIsDesktop();

  useEffect(() => {
    void open(chatId);
  }, [chatId, open]);

  // Is the assistant on screen right now? Always on desktop; on a phone only while the slide-over is open.
  // A ref, so `ask` stays stable and the memoized storefront is not re-rendered when the panel opens or closes.
  const panelVisible = useRef(false);
  panelVisible.current = isDesktop || assistantOpen;

  /**
   * Every button on the page that "asks the assistant" goes through here. If the assistant is not on screen (the
   * phone slide-over was closed), the previous chat is finished as far as the visitor is concerned, so the question
   * starts a new chat instead of being added to it. On desktop the chat is right there, so it continues.
   */
  const ask = useCallback(
    (text: string) => {
      if (!panelVisible.current) reset();
      setAssistantOpen(true);
      void send(text);
    },
    [send, reset],
  );

  async function handleDelete(id: string) {
    await conversations.remove(id);
    if (id === chatId) setParams({}, { replace: true });
  }

  const handleLogout = useCallback(() => void logout(), [logout]);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? 'there';

  return (
    <div ref={panel.rootRef} style={panel.rootStyle} className="flex h-dvh overflow-hidden">
      {/* Storefront */}
      <Storefront userName={user?.name ?? ''} firstName={firstName} orders={orders} catalog={catalog} onAsk={ask} onLogout={handleLogout} />

      {/* Drag to resize the assistant (desktop) */}
      <ResizeHandle width={panel.width} min={panel.min} max={panel.max} dragging={panel.dragging} {...panel.handleProps} />

      {/* Assistant: docked on desktop (resizable), slide-over on mobile */}
      <AssistantPanel
        className={`fixed inset-0 z-40 transition duration-200 lg:static lg:z-auto lg:w-(--panel-w) lg:shrink-0 lg:translate-x-0 lg:border-l lg:border-border lg:transition-none ${
          assistantOpen ? 'translate-x-0' : 'max-lg:invisible max-lg:translate-x-full'
        }`}
        chat={chat}
        conversations={conversations}
        activeId={chatId}
        firstName={firstName}
        textareaRef={textareaRef}
        onNewChat={() => setParams({}, { replace: true })}
        onSelect={(id) => setParams({ chat: id }, { replace: true })}
        onDelete={handleDelete}
        onClose={() => setAssistantOpen(false)}
      />

      <button
        onClick={() => {
          setAssistantOpen(true);
          setTimeout(() => textareaRef.current?.focus(), 220);
        }}
        aria-label="Open the Shoplens assistant"
        className="bg-brand-gradient shadow-pop fixed right-4 bottom-4 z-30 flex h-14 items-center gap-2 rounded-full px-5 font-semibold text-white transition hover:brightness-110 lg:hidden"
      >
        <Icon name="chat" size={20} />
        Ask Shoplens
      </button>
    </div>
  );
}
