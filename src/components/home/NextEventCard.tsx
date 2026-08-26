import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface FeedEvent {
  id: string;
  title: string;
  event_date: string;
  location?: string | null;
  my_rsvp?: string | null;
}

function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return 'in under an hour';
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** The nearest event the caller can see, with one-tap Going or Out. */
export function NextEventCard() {
  const [event, setEvent] = useState<FeedEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_events_feed', {
        p_from: new Date().toISOString(),
        p_to: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
      if (cancelled) return;
      const feed = ((data as FeedEvent[]) || [])
        .filter((e) => new Date(e.event_date).getTime() >= Date.now())
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setEvent(feed[0] || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!event) return null;

  const rsvp = async (status: 'attending' | 'not_attending') => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('rsvp_event', { p_event_id: event.id, p_status: status });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    setEvent({ ...event, my_rsvp: status });
  };

  return (
    <div className="card-ice space-y-2.5 p-3">
      <p className="micro-label">Next event</p>
      <p className="truncate text-[14px] font-semibold text-foreground">{event.title}</p>
      <p className="text-[12px] text-muted-foreground">
        {format(new Date(event.event_date), 'EEE MMM d, h:mm a')} · {countdown(event.event_date)}
      </p>
      {event.my_rsvp === 'attending' || event.my_rsvp === 'not_attending' ? (
        <p className="text-[12px] text-muted-foreground">
          You answered {event.my_rsvp === 'attending' ? 'Going' : 'Out'}.
        </p>
      ) : (
        <div className="flex gap-2">
          <Button className="min-h-11 flex-1" disabled={busy} onClick={() => rsvp('attending')}>
            Going
          </Button>
          <Button
            variant="outline"
            className="min-h-11 flex-1"
            disabled={busy}
            onClick={() => rsvp('not_attending')}
          >
            Out
          </Button>
        </div>
      )}
    </div>
  );
}

export default NextEventCard;
