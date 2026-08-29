import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CalendarClock, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface MarketRow {
  id: string;
  wave: number;
  market: string;
  state: string;
  window_start: string;
  window_end: string;
  status: string;
  official_event_id: string | null;
}

interface OfficialEvent {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
}

function fmtDay(day: string) {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    timeZone: 'UTC', month: 'short', day: 'numeric',
  });
}

function fmtWindow(start: string, end: string | null) {
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return fmtDay(start);
  return `${fmtDay(start)} to ${fmtDay(end)}`;
}

/**
 * Pass 131 — the blitz planning board. Every possible blitz area on one board for
 * managers and above. Owner and admin turn one official, which creates the public
 * RSVP event; the reverse cancels that event and reopens the market.
 */
export function BlitzPlanningBoard() {
  const { role } = useAuth();
  const canSee = role === 'manager' || role === 'president' || role === 'admin' || role === 'owner';
  const canDecide = role === 'admin' || role === 'owner';

  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [official, setOfficial] = useState<OfficialEvent[]>([]);
  const [target, setTarget] = useState<MarketRow | null>(null);
  const [form, setForm] = useState({ start: '', end: '', host: '', location: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canSee) return;
    const [m, e] = await Promise.all([
      supabase.from('blitz_markets').select('*').order('window_start').order('market'),
      supabase
        .from('calendar_events')
        .select('id, title, event_date, end_date, location')
        .eq('event_kind', 'blitz')
        .eq('is_cancelled', false)
        .gte('event_date', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('event_date'),
    ]);
    setMarkets(((m.data as MarketRow[]) || []));
    setOfficial(((e.data as OfficialEvent[]) || []));
  }, [canSee]);

  useEffect(() => { void load(); }, [load]);

  const waves = useMemo(() => {
    const open = markets.filter((r) => r.status !== 'official');
    const byWave = new Map<number, MarketRow[]>();
    for (const r of open) {
      const list = byWave.get(r.wave) || [];
      list.push(r);
      byWave.set(r.wave, list);
    }
    return [...byWave.entries()].sort((a, b) => (a[1][0].window_start < b[1][0].window_start ? -1 : 1));
  }, [markets]);

  const officialMarkets = useMemo(() => markets.filter((r) => r.status === 'official'), [markets]);

  if (!canSee) return null;

  const openDialog = (row: MarketRow) => {
    setForm({ start: row.window_start.slice(0, 10), end: row.window_end.slice(0, 10), host: '', location: '' });
    setTarget(row);
  };

  const makeOfficial = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('make_blitz_official', {
      p_market_id: target.id,
      p_start: form.start,
      p_end: form.end,
      p_host: form.host.trim() || null,
      p_location: form.location.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error('Could not make that blitz official'); return; }
    toast.success('Blitz is official');
    setTarget(null);
    void load();
  };

  const revert = async (row: MarketRow) => {
    const { error } = await (supabase as any).rpc('revert_blitz_official', { p_market_id: row.id });
    if (error) { toast.error('Could not revert that blitz'); return; }
    toast.success('Market reopened');
    void load();
  };

  return (
    <section className="mb-6">
      <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-primary">Blitz planning</h2>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Every possible area. Leadership locks the dates and it becomes a public blitz card.
      </p>

      {official.length > 0 && (
        <div className="mb-4 space-y-2">
          {official.map((ev) => (
            <a
              key={ev.id}
              href={`#event-${ev.id}`}
              className={cn(CARD, 'flex min-h-11 items-center justify-between gap-3 border-primary/30 px-3 py-2.5')}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-foreground">{ev.title}</span>
                <span className="block text-[12px] tabular-nums text-muted-foreground">
                  {fmtWindow(ev.event_date, ev.end_date)}
                  {ev.location ? ` · ${ev.location}` : ''}
                </span>
              </span>
              <span className="shrink-0 rounded-lg bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                Official
              </span>
            </a>
          ))}
        </div>
      )}

      {officialMarkets.length > 0 && (
        <div className="mb-4 space-y-2">
          {officialMarkets.map((row) => (
            <div key={row.id} className={cn(CARD, 'flex items-center justify-between gap-3 px-3 py-2.5')}>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {row.market} {row.state}
                </span>
                <span className="block text-[12px] tabular-nums text-muted-foreground">
                  {fmtWindow(row.window_start, row.window_end)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {row.official_event_id && (
                  <a
                    href={`#event-${row.official_event_id}`}
                    className="inline-flex min-h-9 items-center rounded-lg bg-primary/15 px-2 text-[11px] font-semibold text-primary"
                  >
                    Official
                  </a>
                )}
                {canDecide && (
                  <button
                    onClick={() => revert(row)}
                    className="inline-flex min-h-9 items-center px-1 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Revert
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {waves.map(([wave, rows]) => (
          <div key={wave}>
            <p className="mb-2 text-[12px] font-medium text-muted-foreground">
              Wave {wave} · {fmtWindow(rows[0].window_start, rows[0].window_end)}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map((row) => (
                <div key={row.id} className={cn(CARD, 'px-3 py-2.5')}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-foreground">
                        {row.market} {row.state}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] tabular-nums text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {fmtWindow(row.window_start, row.window_end)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg border border-border/60 bg-surface px-2 py-1 text-[11px] text-muted-foreground">
                      Open
                    </span>
                  </div>
                  {canDecide && (
                    <button
                      onClick={() => openDialog(row)}
                      className="mt-2 inline-flex min-h-9 items-center rounded-lg border border-border/60 bg-surface px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Make it official
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Make it official</DialogTitle>
            <DialogDescription>
              {target ? `${target.market} ${target.state}` : ''}. This creates the public blitz card with going or can't make it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px] text-muted-foreground">
                First day
                <Input
                  type="date"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="text-[12px] text-muted-foreground">
                Last day
                <Input
                  type="date"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="mt-1"
                />
              </label>
            </div>
            <Input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="Host (optional)"
            />
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Location detail (optional)"
                className="pl-9"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={makeOfficial}
              disabled={busy || !form.start || !form.end}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Make it official
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
