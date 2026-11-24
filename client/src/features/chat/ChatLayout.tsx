import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../auth/AuthProvider';
import { Composer } from './Composer';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { SuggestedPrompts } from './SuggestedPrompts';
import { useChatStream } from './useChatStream';
import { useConversations } from './useConversations';

export function ChatLayout() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const conversations = useConversations();

  const chat = useChatStream({
    onConversationCreated: (id) => navigate(`/chat/${id}`, { replace: true }),
    onTurnFinished: () => void conversations.refresh(),
    onNotFound: () => navigate('/chat', { replace: true }),
  });

  useEffect(() => {
    void chat.open(conversationId);
  }, [conversationId, chat.open]);

  const empty = chat.messages.length === 0 && !chat.loadingConversation;

  async function handleDelete(id: string) {
    await conversations.remove(id);
    if (id === conversationId) navigate('/chat');
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: collapses behind a toggle on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <ConversationList
          items={conversations.items}
          activeId={conversationId}
          loading={conversations.loading}
          error={conversations.error}
          hasMore={conversations.hasMore}
          onLoadMore={conversations.loadMore}
          onDelete={handleDelete}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              ☰
            </button>
            <h1 className="text-sm font-semibold">Shoplens Support</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user?.name}</span>
            <Button variant="secondary" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </header>

        {chat.loadingConversation ? (
          <div className="flex flex-1 items-center justify-center text-indigo-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : empty ? (
          <SuggestedPrompts onPick={(t) => void chat.send(t)} />
        ) : (
          <MessageList messages={chat.messages} onRetry={chat.retryMessage} />
        )}

        {chat.sendError && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-2">
            <Banner>
              <div className="flex items-center justify-between gap-3">
                <span>{chat.sendError.message}</span>
                <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={chat.retrySendError}>
                  Retry
                </Button>
              </div>
            </Banner>
          </div>
        )}

        <Composer streaming={chat.streaming} onSend={(t) => void chat.send(t)} onStop={chat.stop} />
      </div>
    </div>
  );
}
