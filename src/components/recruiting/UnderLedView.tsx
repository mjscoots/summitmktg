import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardList, Loader2, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { isAdminOrAbove } from '@/lib/roles';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface Person {
  lead_id: string;
  name: string | null;
  revenue_total: number | null;
  weeks_active: number | null;
  revenue_per_week: number | null;
  last_sale_date: string | null;
  former_manager: string | null;
  departure_type: string | null;
  departure_reason: string | null;
  story: string | null;
  in_outreach: boolean;
}

interface UnderLed {
  max_weeks: number | null;
  min_revenue: number | null;
  not_in_outreach: number;
  people: Person[];
  error?: string;
}

const money = (n: number | null) => (n == null ? null : `$${Math.round(n).toLocaleString()}`);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : null);

export function UnderLedView() {
  const { role } = useAuth();
  const isAdmin = isAdminOrAbove(role);
  const [data, setData] = useState<UnderLed | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [weeks, setWeeks] = useState('');
  const [minRev, setMinRev] = useState('');

  const load = useCallback(async () => {
    const { data: res, error } = await (supabase as any).rpc('get_under_led', {});
    if (error || res?.error) {
      toast.error(res?.error || 'Could not load the under-led view');
      setLoading(false);
      return;
    }
    setData(res as UnderLed);
    setWeeks(res.max_weeks == null ? '' : String(res.max_weeks));
    setMinRev(res.min_revenue == null ? '' : String(res.min_revenue));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveThresholds = async () => {
    setBusy('thresholds');
    const rows = [
      { key: 'under_led_max_weeks', value: weeks.trim() },
      { key: 'under_led_min_revenue', value: minRev.trim() },
    ];
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    setBusy(null);
    if (error) {
      toast.error('Could not save those thresholds');
      return;
    }
    setEditing(false);
    toast.success('Thresholds saved');
    void load();
  };

  const addToOutreach = async (id: string) => {
    setBusy(id);
    const { data: res, error } = await (supabase as any).rpc('add_under_led_outreach', { _lead_id: id });
    setBusy(null);
    if (error || !res?.success) {
      toast.error(res?.error || 'Could not create that task');
      return;
    }
    toast.success('Added to outreach — task assigned to the owner');
    void load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[96px] rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className={cn(CARD, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
        <div>
          <p className="text-sm font-semibold text-foreground">Under-led</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Departed reps sorted by revenue per week active. Weeks active{' '}
            <span className="tabular-nums text-foreground">
              {data.max_weeks == null ? 'not set' : `≤ ${data.max_weeks}`}
            </span>
            {' · '}minimum revenue{' '}
            <span className="tabular-nums text-foreground">
              {data.min_revenue == null ? 'not set' : money(data.min_revenue)}
            </span>
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Settings2 className="mr-1.5 h-4 w-4" /> Thresholds
          </Button>
        )}
      </div>

      {isAdmin && editing && (
        <div className={cn(CARD, 'grid gap-3 p-4 sm:grid-cols-3')}>
          <div>
            <label className="micro-label mb-1 block">Weeks active at most</label>
            <Input value={weeks} inputMode="numeric" onChange={(e) => setWeeks(e.target.value)} className="h-10" />
          </div>
          <div>
            <label className="micro-label mb-1 block">Minimum revenue</label>
            <Input
              value={minRev}
              inputMode="numeric"
              placeholder="not set"
              onChange={(e) => setMinRev(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={saveThresholds} disabled={busy === 'thresholds'} className="w-full">
              {busy === 'thresholds' && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        </div>
      )}

      {data.people.length === 0 ? (
        <EmptyState title="No names match these thresholds" description="Adjust the thresholds or import revenue first." />
      ) : (
        <div className="space-y-2">
          {data.people.map((p) => {
            const bits = [
              money(p.revenue_total),
              p.weeks_active != null ? `${p.weeks_active} ${p.weeks_active === 1 ? 'week' : 'weeks'} active` : null,
              p.revenue_per_week != null ? `${money(p.revenue_per_week)}/wk` : null,
              p.last_sale_date ? `last sale ${fmtDate(p.last_sale_date)}` : null,
            ].filter(Boolean) as string[];
            return (
              <div key={p.lead_id} className={cn(CARD, 'p-4')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-foreground">{p.name || 'Unnamed'}</h3>
                    <p className="mt-1 text-[12px] tabular-nums text-foreground/85">
                      {bits.length > 0 ? bits.join(' · ') : 'No data yet'}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Manager: {p.former_manager || 'No data yet'} · Departure:{' '}
                      {p.departure_type || 'No data yet'}
                      {p.departure_reason ? ` — ${p.departure_reason}` : ''}
                    </p>
                    {p.story && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">{p.story}</p>
                    )}
                  </div>
                  {p.in_outreach ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> In outreach
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => addToOutreach(p.lead_id)} disabled={busy === p.lead_id}>
                      {busy === p.lead_id ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardList className="mr-1.5 h-4 w-4" />
                      )}
                      Add to outreach
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
