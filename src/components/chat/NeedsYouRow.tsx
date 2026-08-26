import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useActionCards, type ActionCard } from '@/hooks/useActionCards';


function fmtWhen(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, 'EEE MMM d, h:mm a');
}

function RsvpCard({ card, onDone }: { card: ActionCard; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const when = fmtWhen(card.when_at);

  const answer = async (status: 'attending' | 'not_attending' | 'maybe') => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('rsvp_event', { p_event_id: card.id, p_status: status });
    setBusy(false);
    if (error) { toast.error('That did not save. Try again.'); return; }
    onDone();
  };

  return (
    <div className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">RSVP</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">{card.title}</p>
      {when && <p className="mt-0.5 text-[12px] text-muted-foreground">{when}</p>}
      <div className="mt-2 flex gap-2">
        {([['attending', 'Going'], ['not_attending', "Can't"], ['maybe', 'Maybe']] as const).map(([s, label]) => (
          <button
            key={s}
            onClick={() => answer(s)}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-lg border border-border/60 bg-background text-[12px] text-muted-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
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
      onClick={() => navigate('/app/dashboard')}
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
  const { cards, dismiss } = useActionCards();
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
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {behind && (
          <FirstWeekBehindCard
            key="first-week"
            day={behind.day}
            label={behindItem?.label || behind.title}
          />
        )}
        {cards.map((card) => {
          const key = `${card.type}-${card.id}`;
          if (card.type === 'rsvp') return <RsvpCard key={key} card={card} onDone={() => dismiss('rsvp', card.id)} />;
          if (card.type === 'announcement') {
            return <AnnouncementActionCard key={key} card={card} onDone={() => dismiss('announcement', card.id)} />;
          }
          if (card.type === 'setup_step') return <SetupStepCard key={key} card={card} />;
          return <IncentiveActionCard key={key} card={card} />;
        })}
      </div>
    </div>
  );
}

