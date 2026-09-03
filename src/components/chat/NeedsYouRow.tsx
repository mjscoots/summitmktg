import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActionCards, type ActionCard } from '@/hooks/useActionCards';
import { useFirstWeek } from '@/hooks/useFirstWeek';


function fmtWhen(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, 'EEE MMM d, h:mm a');
}

function AnnouncementActionCard({ card, onDone }: { card: ActionCard; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  const ack = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('ack_announcement', { _post_id: card.id });
    setBusy(false);
    if (error) { toast.error('That did not save. Try again.'); return; }
    onDone();
  };

  return (
    <div className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Pinned update</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">{card.title}</p>
      {card.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{card.body}</p>}
      <button
        onClick={ack}
        disabled={busy}
        className="mt-2 min-h-[44px] w-full rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        Got it
      </button>
    </div>
  );
}

function IncentiveActionCard({ card }: { card: ActionCard }) {
  return (
    <div className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Incentive ending</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">{card.title}</p>
      {card.ends_on && (
        <p className="mt-0.5 text-[12px] text-muted-foreground">Ends {format(new Date(card.ends_on), 'MMM d')}</p>
      )}
      {card.prize_note && <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{card.prize_note}</p>}
    </div>
  );
}

/** Setup step a rep has not finished within its allowed days. */
function SetupStepCard({ card }: { card: ActionCard }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/app/industries')}
      className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-card p-3 text-left"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Setup step</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">{card.title}</p>
      <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{card.body || 'Open your setup steps'}</p>
    </button>
  );
}

/** First week day the rep has fallen behind on. */
function FirstWeekBehindCard({ day, label }: { day: number; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/app')}
      className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-card p-3 text-left"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        First week
      </p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">Day {day} is open</p>
      <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{label}</p>
    </button>
  );
}

/** Row of unresolved items. Renders nothing when there is nothing to do. */
export function NeedsYouRow({ className }: { className?: string }) {
  const { cards: allCards, dismiss } = useActionCards();
  // Events live on the Events page, so the chat list never asks for an RSVP.
  const cards = allCards.filter((c) => c.type !== 'rsvp');
  const { week } = useFirstWeek();
  const behind =
    week.found && !week.complete && week.behind_days > 0
      ? week.days.find((d) => d.day <= week.day_number && !d.complete) || null
      : null;
  const behindItem = behind?.items.find((i) => !i.done) || null;
  if (cards.length === 0 && !behind) return null;

  return (
    <div className={cn('px-4 pt-3', className)}>
      <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Needs you</p>
      <div className="relative -mx-4">
        <div className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 [&>*]:snap-start">

        {behind && (
          <FirstWeekBehindCard
            key="first-week"
            day={behind.day}
            label={behindItem?.label || behind.title}
          />
        )}
        {cards.map((card) => {
          const key = `${card.type}-${card.id}`;
          if (card.type === 'announcement') {
            return <AnnouncementActionCard key={key} card={card} onDone={() => dismiss('announcement', card.id)} />;
          }
          if (card.type === 'setup_step') return <SetupStepCard key={key} card={card} />;
          return <IncentiveActionCard key={key} card={card} />;
        })}
        </div>
        {(cards.length + (behind ? 1 : 0)) > 1 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
          />
        )}
      </div>
    </div>

  );
}

