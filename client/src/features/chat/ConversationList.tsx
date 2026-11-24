import type { ConversationDto } from '@shared';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface Props {
  items: ConversationDto[];
  activeId?: string;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  onLoadMore(): void;
  onDelete(id: string): void;
  onNavigate?(): void;
}

export function ConversationList({ items, activeId, loading, error, hasMore, onLoadMore, onDelete, onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Link to="/chat" onClick={onNavigate}>
          <Button className="w-full">+ New chat</Button>
        </Link>
      </div>
      <nav aria-label="Past conversations" className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loading && (
          <div className="flex justify-center p-4 text-indigo-600">
            <Spinner />
          </div>
        )}
        {error && <p className="p-2 text-xs text-red-600">Couldn't load your conversations.</p>}
        {!loading && !error && items.length === 0 && <p className="p-2 text-xs text-slate-500">No conversations yet.</p>}
        {items.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center rounded-lg ${c.id === activeId ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-100'}`}
          >
            <Link
              to={`/chat/${c.id}`}
              onClick={onNavigate}
              aria-current={c.id === activeId ? 'page' : undefined}
              className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
              title={c.title}
            >
              {c.title}
            </Link>
            <button
              onClick={() => onDelete(c.id)}
              aria-label={`Delete conversation ${c.title}`}
              className="px-2 text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        {hasMore && (
          <Button variant="ghost" className="w-full" onClick={onLoadMore}>
            Load more
          </Button>
        )}
      </nav>
    </div>
  );
}
