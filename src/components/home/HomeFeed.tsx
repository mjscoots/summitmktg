import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatChannels } from '@/hooks/useChatChannels';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';
import { NextUpCard } from '@/components/training/NextUpCard';
import { TrainingWeekRow } from '@/components/training/TrainingWeekRow';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

interface FeedEvent {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  event_kind: string;
  my_rsvp: string | null;
  going_count: number;
}

function utcDay(iso: string, withWeekday = false) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    month: 'short',
    day: 'numeric',
  });
}

function whenLine(ev: FeedEvent) {
  const start = new Date(ev.event_date).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  if (!ev.end_date || ev.end_date.slice(0, 10) === ev.event_date.slice(0, 10)) return start;
  return `${utcDay(ev.event_date, true)} to ${utcDay(ev.end_date)}`;
}

function agoLabel(iso: string | null) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return utcDay(iso);
}

/** The chat row: the latest line in the rep's most active group room. */
function ChatRow() {
  const navigate = useNavigate();
  const { channels, loading } = useChatChannels();

  const room = useMemo(() => {
    const groups = channels.filter((c) => c.kind !== 'dm' && c.last_content);
    const unread = groups.filter((c) => c.unread > 0);
    const pool = unread.length ? unread : groups;
    return pool
      .slice()
      .sort((a, b) => new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime())[0] || null;
  }, [channels]);

  if (loading || !room) return null;
  const sender = (room.last_sender || '').trim().split(/\s+/)[0];

  return (
    <section>
      <SectionEyebrow>Chat</SectionEyebrow>
      <button
        type="button"
        onClick={() => navigate(`/app/chat?room=${encodeURIComponent(room.slug)}`)}
        className="card-ice flex min-h-14 w-full items-center gap-3 p-3 text-left"
      >
        <ChannelAvatar name={room.label} coverPath={room.cover_image_path} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{room.label}</p>
          <p className="mt-0.5 truncate text-[14px] text-muted-foreground">
            {sender ? `${sender}: ` : ''}{room.last_content}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[12px] tabular-nums text-muted-foreground">{agoLabel(room.last_at)}</span>
          {room.unread > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums"
              style={{
                background: 'hsl(var(--workspace-accent) / 0.16)',
                color: 'hsl(var(--workspace-accent))',
              }}
            >
              {room.unread > 99 ? '99+' : room.unread}
            </span>
          )}
        </div>
      </button>
    </section>
  );
}

function RsvpButtons({ ev, onAnswer }: { ev: FeedEvent; onAnswer: (s: string) => void }) {
  const [busy, setBusy] = useState(false);

  const answer = async (status: 'attending' | 'not_attending') => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('rsvp_event', { p_event_id: ev.id, p_status: status });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    onAnswer(status);
  };

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => answer('attending')}
        className={cn(
          'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors',
          ev.my_rsvp === 'attending'
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-surface text-muted-foreground hover:text-foreground'
        )}
      >
        <Check className="h-4 w-4" /> Going
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => answer('not_attending')}
        className={cn(
          'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors',
          ev.my_rsvp === 'not_attending'
            ? 'bg-muted text-foreground'
            : 'border border-border bg-surface text-muted-foreground hover:text-foreground'
        )}
      >
        <X className="h-4 w-4" /> Can't make it
      </button>
    </div>
  );
}

/**
 * Pass 118 - the daily loop, in order: chat, events, money, training.
 * Every row renders from live data and disappears when there is none.
 */
export function HomeFeed() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<FeedEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_events_feed', {
        p_from: new Date().toISOString(),
        p_to: new Date(Date.now() + 240 * 86_400_000).toISOString(),
      });
      if (cancelled) return;
      const rows = ((data as FeedEvent[]) || [])
        .slice()
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setEvents(rows);
    })();
    return () => { cancelled = true; };
  }, []);

  const now = Date.now();
  // Next two by start time; a blitz stays open until its last day passes.
  const nextTwo = events.filter((e) => new Date(e.event_date).getTime() >= now).slice(0, 2);
  const openBlitzes = events.filter(
    (e) => e.event_kind === 'blitz' && new Date(e.end_date || e.event_date).getTime() >= now
  );


  const setRsvp = (id: string, status: string) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, my_rsvp: status } : e)));

  return (
    <div className="space-y-8">
      {nextTwo.length > 0 && (
        <section>
          <SectionEyebrow>Events</SectionEyebrow>
          <div className="space-y-3">
            {nextTwo.map((ev) => (
              <div key={ev.id} className="card-ice p-3">
                <p className="truncate text-[15px] font-semibold text-foreground">{ev.title}</p>
                <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
                  {whenLine(ev)}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
                {ev.my_rsvp === 'attending' || ev.my_rsvp === 'not_attending' ? (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    You answered {ev.my_rsvp === 'attending' ? 'Going' : "Can't make it"}.
                  </p>
                ) : (
                  <RsvpButtons ev={ev} onAnswer={(s) => setRsvp(ev.id, s)} />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/events')}
            className="mt-2 flex min-h-11 w-full items-center justify-between px-1 text-left text-[14px] text-muted-foreground"
          >
            All events
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {openBlitzes.length > 0 && (
        <section>
          <SectionEyebrow>Blitzes</SectionEyebrow>
          <div className="space-y-2">
            {openBlitzes.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => navigate(`/app/events#event-${ev.id}`)}
                className="card-ice flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{ev.title}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                  {whenLine(ev)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <ChatRow />

      <section>
        <SectionEyebrow>Training</SectionEyebrow>
        <NextUpCard />
        <TrainingWeekRow />
      </section>
    </div>
  );
}

export default HomeFeed;
