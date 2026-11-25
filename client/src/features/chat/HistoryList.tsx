import type { ConversationDto } from '@shared';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { tip } from '../../lib/tip';
import { groupByDate } from './groupByDate';

interface Props {
  items: ConversationDto[];
  activeId?: string;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  onLoadMore(): void;
  onSelect(id: string): void;
  onDelete(id: string): void;
}

/** Past conversations, grouped by day. */
export function HistoryList({ items, activeId, loading, error, hasMore, onLoadMore, onSelect, onDelete }: Props) {
  const groups = groupByDate(items);
  return (
    <nav aria-label="Past conversations" className="scroll-thin h-full overflow-y-auto px-2 pb-3">
      {loading && (
        <div className="space-y-2 p-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      )}
      {error && <p className="p-3 text-[13px] text-danger">Couldn't load your conversations.</p>}
      {!loading && !error && items.length === 0 && <p className="p-3 text-[13px] text-muted">No conversations yet. Ask the assistant something!</p>}

      {groups.map((g) => (
        <div key={g.label} className="mt-2">
          <h3 className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{g.label}</h3>
          <ul className="space-y-0.5">
            {g.items.map((c) => (
              <li key={c.id} className={`group flex items-center rounded-xl transition ${c.id === activeId ? 'bg-brand-soft text-brand' : 'hover:bg-surface-2'}`}>
                <button onClick={() => onSelect(c.id)} aria-current={c.id === activeId ? 'true' : undefined} title={c.title} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[13.5px]">
                  {c.title}
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  aria-label={`Delete conversation ${c.title}`}
                  {...tip('Delete conversation', 'left')}
                  className="mr-1 grid h-7 w-7 place-items-center rounded-lg text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger focus:opacity-100"
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {hasMore && (
        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onLoadMore}>
          Load more
        </Button>
      )}
    </nav>
  );
}
