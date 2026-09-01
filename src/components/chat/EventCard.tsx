import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { BLITZ_FULL_MESSAGE, useBlitzCap } from '@/hooks/useBlitzCap';
import { BlitzCapBar } from '@/components/blitz/BlitzCapBar';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';


export interface EventCardMeta {
  title?: string;
  event_date?: string;
  end_date?: string | null;
  location?: string | null;
  event_kind?: string;
  rsvp_deadline?: string | null;
  questions?: EventQuestion[];
  cancelled?: boolean;
  /** Plain cadence for a repeating series, e.g. "repeats weekly". */
  repeats?: string | null;
  series_root?: string | null;
}

interface EventQuestion {
  key?: string;
  label?: string;
  type?: string;
  options?: string[];
}

interface Rollup {
  is_staff: boolean;
  going: { user_id: string; name: string | null; answers: Record<string, string> | null }[];
  not_going: { user_id: string; name: string | null }[];
  maybe: { user_id: string; name: string | null }[];
  no_answer: { user_id: string; name: string | null }[] | null;
  going_count: number;
}

const KIND_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  trip: 'Trip',
  incentive: 'Incentive',
  training: 'Training',
  other: 'Event',
};

const STATUS_LABELS: Record<string, string> = {
  attending: 'Going',
  not_attending: "Can't",
  maybe: 'Maybe',
};

function fmtWhen(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, 'EEE MMM d, h:mm a');
}

export function EventCard({ eventId, meta, title }: { eventId: string | null; meta: EventCardMeta | null; title: string }) {
  const [rollup, setRollup] = useState<Rollup | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'going' | 'pending' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [askOpen, setAskOpen] = useState(false);
  const cap = useBlitzCap(eventId);

  const questions = (meta?.questions || []).filter((q) => q && (q.label || q.key));
  const kindLabel = KIND_LABELS[meta?.event_kind || 'other'] || 'Event';
  const when = fmtWhen(meta?.event_date);
  const deadline = fmtWhen(meta?.rsvp_deadline || undefined);
  const capFull = cap.state?.capacity != null && (cap.state.spots_left ?? 0) === 0;


  const load = useCallback(async () => {
    if (!eventId) return;
    const { data } = await (supabase as any).rpc('get_event_rsvp_rollup', { _event_id: eventId });
    if (data && !data.error) setRollup(data as Rollup);
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!eventId) return;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from('calendar_attendance')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', uid)
        .maybeSingle();
      if (!cancelled) setMine((data as { status?: string } | null)?.status ?? null);
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const submit = async (status: 'attending' | 'not_attending' | 'maybe', withAnswers?: Record<string, string>) => {
    if (!eventId) return;
    setBusy(true);
    const { error } = withAnswers
      ? await (supabase as any).rpc('rsvp_event', { p_event_id: eventId, p_status: status, p_answers: withAnswers })
      : await (supabase as any).rpc('rsvp_event', { p_event_id: eventId, p_status: status });
    setBusy(false);
    if (error) {
      const full = String((error as { message?: string }).message || '').includes('blitz_full');
      toast.error(full ? BLITZ_FULL_MESSAGE : 'That did not save. Try again.');
      if (full) void cap.refresh();
      return;
    }
    setMine(status);
    setAskOpen(false);
    void load();
    void cap.refresh();
  };


  const onPick = (status: 'attending' | 'not_attending' | 'maybe') => {
    if (status === 'attending' && questions.length > 0) { setAskOpen(true); return; }
    void submit(status);
  };

  const cancelled = !!meta?.cancelled;

  return (
    <div className="my-3 px-3">
      <div className="mx-auto max-w-md rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{kindLabel}</span>
          {cancelled && <span className="text-[11px] font-semibold text-destructive">Cancelled</span>}
        </div>
        <p className="mt-1 text-[15px] font-semibold text-foreground">{meta?.title || title}</p>

        <div className="mt-2 space-y-1 text-[12px] text-muted-foreground">
          {when && (
            <p className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> {when}
            </p>
          )}
          {meta?.location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {meta.location}
            </p>
          )}
          {meta?.repeats && <p>{meta.repeats}</p>}
          {deadline && <p>Answer by {deadline}</p>}
        </div>

        {!cancelled && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(['attending', 'not_attending', 'maybe'] as const)
              .filter((s) => !(s === 'attending' && capFull && mine !== 'attending'))
              .map((s) => (
              <button
                key={s}
                onClick={() => onPick(s)}
                disabled={busy}
                className={cn(
                  'min-h-[44px] rounded-lg border px-3 text-[13px] font-medium transition-colors disabled:opacity-50',
                  mine === s
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border/60 bg-background text-muted-foreground hover:border-primary/40',
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {!cancelled && (
          <BlitzCapBar
            state={cap.state}
            busy={cap.busy}
            attending={mine === 'attending'}
            onJoin={cap.join}
            onLeave={cap.leave}
          />
        )}


        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
          <button
            onClick={() => setSheet('going')}
            className="flex min-h-[44px] items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5" />
            {rollup?.going_count ?? 0} going
          </button>
          {rollup?.is_staff && rollup.no_answer && (
            <button
              onClick={() => setSheet('pending')}
              className="min-h-[44px] text-muted-foreground hover:text-foreground"
            >
              {rollup.no_answer.length} hasn't answered
            </button>
          )}
        </div>
      </div>

      <Sheet open={askOpen} onOpenChange={setAskOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>A few details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {questions.map((q, i) => {
              const key = q.key || q.label || `q${i}`;
              return (
                <div key={key}>
                  <label className="text-[13px] text-foreground">{q.label || key}</label>
                  {q.options && q.options.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => setAnswers((p) => ({ ...p, [key]: o }))}
                          className={cn(
                            'min-h-[44px] rounded-lg border px-3 text-[13px]',
                            answers[key] === o
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border/60 text-muted-foreground',
                          )}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={answers[key] || ''}
                      onChange={(e) => setAnswers((p) => ({ ...p, [key]: e.target.value }))}
                      className="mt-2 min-h-[44px] w-full rounded-lg border border-border/60 bg-background px-3 text-[14px] text-foreground"
                    />
                  )}
                </div>
              );
            })}
            <button
              onClick={() => submit('attending', answers)}
              disabled={busy}
              className="min-h-[44px] w-full rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet === 'pending' ? "Hasn't answered" : "Who's going"}</SheetTitle>
          </SheetHeader>
          <ul className="mt-4 space-y-2">
            {(sheet === 'pending' ? rollup?.no_answer || [] : rollup?.going || []).map((p) => (
              <li key={p.user_id} className="flex items-center justify-between text-[13px] text-foreground">
                <span>{p.name || 'Team member'}</span>
                {sheet === 'going' && (p as { answers?: Record<string, string> | null }).answers && (
                  <span className="text-[12px] text-muted-foreground">
                    {Object.values((p as { answers?: Record<string, string> | null }).answers || {}).join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
