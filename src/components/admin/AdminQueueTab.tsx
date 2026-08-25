import { useMemo, useState } from 'react';
import {
  Inbox,
  Check,
  X,
  EyeOff,
  Clock,
  UserCheck,
  Video,
  MessageSquare,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingList } from '@/components/shared/LoadingList';
import { cn } from '@/lib/utils';
import {
  useAdminQueue,
  isStale,
  itemAgeDays,
  STALE_DAYS,
  type QueueItem,
  type QueueItemType,
} from '@/hooks/useAdminQueue';

const TYPE_META: Record<QueueItemType, { label: string; icon: typeof Inbox; actionable: boolean }> = {
  approval: { label: 'Rep approval', icon: UserCheck, actionable: true },
  pitch: { label: 'Pitch review', icon: Video, actionable: true },
  feedback: { label: 'Feedback', icon: MessageSquare, actionable: false },
  sync: { label: 'Hierarchy sync', icon: GitBranch, actionable: false },
};

type TypeFilter = 'all' | QueueItemType;
type AgeFilter = 'all' | '7' | '30';
type SortOrder = 'oldest' | 'newest';

export function AdminQueueTab() {
  const { items, counts, isLoading, dismissItems, approveItems, denyItems } = useAdminQueue();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const staleItems = useMemo(() => items.filter(isStale), [items]);

  const visible = useMemo(() => {
    let list = items;
    if (typeFilter !== 'all') list = list.filter((i) => i.type === typeFilter);
    if (ageFilter !== 'all') {
      const min = Number(ageFilter);
      list = list.filter((i) => itemAgeDays(i) >= min);
    }
    const sorted = [...list];
    if (sortOrder === 'newest') sorted.reverse();
    return sorted;
  }, [items, typeFilter, ageFilter, sortOrder]);

  const selectedItems = useMemo(
    () => visible.filter((i) => selected.has(i.key)),
    [visible, selected]
  );
  const canApprove = selectedItems.some((i) => TYPE_META[i.type].actionable);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible.map((i) => i.key))
    );
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setSelected(new Set());
      toast.success(label);
    } catch {
      toast.error('Action failed — nothing was changed');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <LoadingList rows={6} />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {(
          [
            ['Total', counts.total],
            ['Approvals', counts.pendingApprovals],
            ['Pitches', counts.pendingPitches],
            ['Feedback', counts.newFeedback],
            ['Sync', counts.syncIssues],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="stat-card">
            <span className="micro-label">{label}</span>
            <p className="stat-value mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-white/[0.06] bg-card/60 p-2.5 backdrop-blur-sm">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="h-11 w-[150px] text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(TYPE_META) as QueueItemType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageFilter} onValueChange={(v) => setAgeFilter(v as AgeFilter)}>
          <SelectTrigger className="h-11 w-[140px] text-xs">
            <SelectValue placeholder="Any age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any age</SelectItem>
            <SelectItem value="7">7+ days old</SelectItem>
            <SelectItem value="30">30+ days (stale)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="h-11 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
          </SelectContent>
        </Select>

        {staleItems.length > 0 && (
          <Button
            variant="outline"
            className="h-11 gap-1.5 text-xs"
            disabled={busy}
            onClick={() =>
              run(`Dismissed ${staleItems.length} stale items`, () => dismissItems(staleItems))
            }
          >
            <Clock className="h-3.5 w-3.5" />
            Dismiss all stale ({staleItems.length})
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedItems.length > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-primary/25 bg-primary/[0.07] p-2.5 backdrop-blur-sm">
          <span className="micro-label mr-auto">{selectedItems.length} selected</span>
          {canApprove && (
            <>
              <Button
                size="sm"
                className="h-11 gap-1.5 text-xs"
                disabled={busy}
                onClick={() =>
                  run(`Approved ${selectedItems.length} items`, () => approveItems(selectedItems))
                }
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-11 gap-1.5 text-xs"
                disabled={busy}
                onClick={() =>
                  run(`Denied ${selectedItems.length} items`, () => denyItems(selectedItems))
                }
              >
                <X className="h-3.5 w-3.5" />
                Deny
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-11 gap-1.5 text-xs"
            disabled={busy}
            onClick={() =>
              run(`Dismissed ${selectedItems.length} items`, () => dismissItems(selectedItems))
            }
          >
            <EyeOff className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={counts.total === 0 ? 'Queue is clear' : 'Nothing matches these filters'}
          description={
            counts.total === 0
              ? 'No approvals, pitch reviews, feedback or sync issues are waiting.'
              : 'Adjust the type or age filter to see other pending items.'
          }
          className="py-12"
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-white/[0.06] bg-card/60 backdrop-blur-sm">
          <button
            onClick={toggleAll}
            className="flex min-h-11 w-full items-center gap-3 border-b border-white/[0.06] px-3 text-left"
          >
            <Checkbox checked={selected.size === visible.length && visible.length > 0} />
            <span className="micro-label">
              {selected.size === visible.length && visible.length > 0 ? 'Clear' : 'Select'} all{' '}
              {visible.length}
            </span>
          </button>

          <div className="divide-y divide-white/[0.04]">
            {visible.slice(0, visibleCount).map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                checked={selected.has(item.key)}
                onToggle={() => toggle(item.key)}
              />
            ))}
          </div>

          {visible.length > visibleCount && (
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
              <span className="text-[11px] text-muted-foreground">
                Showing {visibleCount} of {visible.length}
              </span>
              <button
                onClick={() => setVisibleCount((c) => c + 50)}
                className="min-h-9 rounded-lg border border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Load 50 more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  checked,
  onToggle,
}: {
  item: QueueItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const age = itemAgeDays(item);
  const stale = isStale(item);

  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex min-h-[60px] cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]',
        checked && 'bg-primary/[0.05]'
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} onClick={(e) => e.stopPropagation()} />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
          {stale && (
            <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
              Stale
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="micro-label">{meta.label}</p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {item.createdAt ? `${age}d` : '—'}
        </p>
      </div>
    </div>
  );
}

export { STALE_DAYS };
