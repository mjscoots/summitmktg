import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface UpcomingEvent {
  event_id: string;
  title: string;
  event_date: string;
  event_kind: string;
  rsvp_deadline: string | null;
}

interface Rollup {
  going: { user_id: string; name: string | null }[];
  not_going: { user_id: string; name: string | null }[];
  maybe: { user_id: string; name: string | null }[];
  no_answer: { user_id: string; name: string | null }[] | null;
}

function fmtWhen(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, 'EEE MMM d');
}

/** Upcoming trips and incentives with who has not answered yet. */
export function EventAnswersPanel() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [rollups, setRollups] = useState<Record<string, Rollup>>({});
  const [open, setOpen] = useState<UpcomingEvent | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('get_event_answer_columns');
    const list = ((data?.events || []) as UpcomingEvent[]) ?? [];
    setEvents(list);
    const entries = await Promise.all(
      list.map(async (ev) => {
        const { data: r } = await (supabase as any).rpc('get_event_rsvp_rollup', { _event_id: ev.event_id });
        return [ev.event_id, r && !r.error ? (r as Rollup) : null] as const;
      })
    );
    const map: Record<string, Rollup> = {};
    entries.forEach(([id, r]) => {
      if (r) map[id] = r;
    });
    setRollups(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (events.length === 0) return null;

  const active = open ? rollups[open.event_id] : null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Answers - upcoming trips and incentives</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Event</th>
              <th className="px-2 py-2 text-right font-medium">Going</th>
              <th className="px-2 py-2 text-right font-medium">Can't</th>
              <th className="px-2 py-2 text-right font-medium">Maybe</th>
              <th className="py-2 pl-2 text-right font-medium">No answer</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const r = rollups[ev.event_id];
              return (
                <tr
                  key={ev.event_id}
                  className="cursor-pointer border-b border-border/30 last:border-0 hover:bg-muted/30"
                  onClick={() => setOpen(ev)}
                >
                  <td className="py-3 pr-3">
                    <span className="font-medium text-foreground">{ev.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmtWhen(ev.event_date)}
                      {ev.rsvp_deadline ? ` · answer by ${fmtWhen(ev.rsvp_deadline)}` : ''}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{r ? r.going.length : '-'}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{r ? r.not_going.length : '-'}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{r ? r.maybe.length : '-'}</td>
                  <td className="py-3 pl-2 text-right tabular-nums">{r?.no_answer ? r.no_answer.length : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-base">{open?.title}</SheetTitle>
          </SheetHeader>
          {active ? (
            <div className="mt-3 space-y-4">
              {([
                ['No answer', active.no_answer || []],
                ['Going', active.going],
                ["Can't", active.not_going],
                ['Maybe', active.maybe],
              ] as const).map(([label, list]) => (
                <div key={label}>
                  <p className="text-[13px] font-medium">
                    {label} <span className="text-muted-foreground">· {list.length}</span>
                  </p>
                  {list.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">None</p>
                  ) : (
                    list.map((p) => (
                      <p key={p.user_id} className="text-[13px] text-muted-foreground">
                        {p.name || 'Unnamed'}
                      </p>
                    ))
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">No answer data available.</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
