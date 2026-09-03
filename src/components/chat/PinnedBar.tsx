import { useState } from 'react';
import { ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { AnnouncementCard } from '@/components/chat/AnnouncementCard';
import { IncentiveCard } from '@/components/chat/IncentiveCard';

export interface PinnedItem {
  id: string;
  kind: string;
  content: string;
  ref_id: string | null;
  meta: Record<string, unknown> | null;
  answered?: number;
}

/** Collapsible bar for the latest pinned card in this room. */
export function PinnedBar({ item }: { item: PinnedItem }) {
  const [open, setOpen] = useState(false);
  const meta = (item.meta || {}) as Record<string, any>;
  // Events are not chat material, so an event row never pins.
  if (item.kind === 'event') return null;
  const label =
    item.kind === 'incentive' ? 'Incentive' : item.kind === 'announcement' ? 'Update' : 'Pinned';
  const title = (meta.title as string) || item.content;

  return (
    <div className="flex-shrink-0 border-b border-border/10 bg-background/60 backdrop-blur-2xl">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left"
        aria-expanded={open}
      >
        <Pin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{label}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{title}</span>
        {typeof item.answered === 'number' && item.answered > 0 && (
          <span className="flex-shrink-0 text-[11px] text-muted-foreground">{item.answered} answered</span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="pb-1">
          {item.kind === 'announcement' && <AnnouncementCard postId={item.ref_id} meta={meta} title={item.content} />}
          {item.kind === 'incentive' && <IncentiveCard incentiveId={item.ref_id} meta={meta} title={item.content} />}
          {!['announcement', 'incentive'].includes(item.kind) && (
            <p className="whitespace-pre-wrap px-3 pb-2 text-[13px] text-muted-foreground">{item.content}</p>
          )}
        </div>
      )}
    </div>
  );
}
