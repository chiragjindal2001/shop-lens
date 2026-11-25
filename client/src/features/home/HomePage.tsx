import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/icons';
import { useAuth } from '../auth/AuthProvider';
import { AssistantPanel } from '../chat/AssistantPanel';
import { useChatStream } from '../chat/useChatStream';
import { useConversations } from '../chat/useConversations';
import { changesOrders } from './orderTools';
import { Storefront } from './Storefront';
import { useOrders } from './useOrders';
import { useProducts } from './useProducts';

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
  const { open, send } = chat;

  useEffect(() => {
    void open(chatId);
  }, [chatId, open]);

  /** Every button on the page that "asks the assistant" goes through here. */
  const ask = useCallback(
    (text: string) => {
      setAssistantOpen(true);
      void send(text);
    },
    [send],
  );

  async function handleDelete(id: string) {
    await conversations.remove(id);
    if (id === chatId) setParams({}, { replace: true });
  }

  const handleLogout = useCallback(() => void logout(), [logout]);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? 'there';

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Storefront */}
      <Storefront userName={user?.name ?? ''} firstName={firstName} orders={orders} catalog={catalog} onAsk={ask} onLogout={handleLogout} />

      {/* Assistant: docked on desktop, slide-over on mobile */}
      <AssistantPanel
        className={`fixed inset-0 z-40 transition duration-200 lg:static lg:z-auto lg:w-[28rem] lg:shrink-0 lg:translate-x-0 lg:border-l lg:border-border lg:transition-none ${
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
