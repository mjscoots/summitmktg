import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Cable } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';
const ALL = 'all';

interface Row {
  user_id: string;
  full_name: string | null;
  region_name: string | null;
  carrier_name: string | null;
  week_start: string;
  installs: number;
  cancels: number;
}
interface RegionTotal { region_name: string; installs: number; cancels: number; reps: number }
interface TrendRow { week_start: string; installs: number; cancels: number }
interface Report { rows: Row[]; region_totals: RegionTotal[]; trend: TrendRow[] }

const rate = (installs: number, cancels: number) => {
  const total = installs + cancels;
  return total > 0 ? `${Math.round((cancels / total) * 100)}%` : '—';
};

/** Fiber installs per rep per week with cancel rate, region totals, a 4-week trend, and CSV export. */
export function FiberReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [regionId, setRegionId] = useState<string>(ALL);
  const [carrierId, setCarrierId] = useState<string>(ALL);

  useEffect(() => {
    (async () => {
      const [{ data: rs }, { data: cs }] = await Promise.all([
        supabase.from('regions').select('id, name').eq('vertical', 'Fiber').eq('active', true).order('name'),
        supabase.from('carriers').select('id, name').eq('vertical', 'Fiber').eq('active', true).order('name'),
      ]);
      setRegions((rs as { id: string; name: string }[]) ?? []);
      setCarriers((cs as { id: string; name: string }[]) ?? []);
    })();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_fiber_report' as never, {
      _weeks: 4,
      _region_id: regionId === ALL ? null : regionId,
      _carrier_id: carrierId === ALL ? null : carrierId,
    } as never);
    const res = data as unknown as Report | null;
    setReport({
      rows: res?.rows ?? [],
      region_totals: res?.region_totals ?? [],
      trend: res?.trend ?? [],
    });
  }, [regionId, carrierId]);

  useEffect(() => { load(); }, [load]);

  const csv = useMemo(() => {
    if (!report) return '';
    const head = ['Rep', 'Region', 'Carrier', 'Week', 'Installs', 'Cancels', 'Cancel rate'];
    const lines = report.rows.map((r) => [
      r.full_name || '',
      r.region_name || '',
      r.carrier_name || '',
      r.week_start,
      String(r.installs),
      String(r.cancels),
      rate(r.installs, r.cancels),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(','));
    return [head.join(','), ...lines].join('\n');
  }, [report]);

  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiber-installs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  const empty = report.rows.length === 0;

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Cable className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Fiber Installs</h2>
        </div>
        <Button size="sm" variant="secondary" className="min-h-9" onClick={download} disabled={empty}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={regionId} onValueChange={setRegionId}>
          <SelectTrigger className="h-9 w-40 bg-card/50"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={carrierId} onValueChange={setCarrierId}>
          <SelectTrigger className="h-9 w-40 bg-card/50"><SelectValue placeholder="Carrier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All carriers</SelectItem>
            {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {empty ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No install data entered yet.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {report.region_totals.map((t) => (
              <div key={t.region_name} className="rounded-lg border border-border/50 bg-surface p-3">
                <p className="micro-label">{t.region_name}</p>
                <p className="text-[15px] font-semibold text-foreground tabular-nums">{t.installs} installs</p>
                <p className="text-[12px] text-muted-foreground tabular-nums">
                  {t.cancels} cancels · {rate(t.installs, t.cancels)} cancel rate · {t.reps} reps
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="micro-label">4-week trend</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.trend.map((w) => (
                <div key={w.week_start} className="rounded-lg border border-border/50 bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted-foreground tabular-nums">{w.week_start}</p>
                  <p className="text-[13px] font-semibold text-foreground tabular-nums">{w.installs} installs</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{rate(w.installs, w.cancels)} cancel rate</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium">Carrier</th>
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 font-medium text-right">Installs</th>
                  <th className="px-3 py-2 font-medium text-right">Cancels</th>
                  <th className="px-3 py-2 font-medium text-right">Cancel rate</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr key={`${r.user_id}-${r.week_start}-${i}`} className="border-b border-border/30 last:border-0">
                    <td className="px-3 py-2 text-foreground">{r.full_name || 'Unnamed'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.region_name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.carrier_name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.week_start}</td>
                    <td className="px-3 py-2 text-right text-foreground tabular-nums">{r.installs}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{r.cancels}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{rate(r.installs, r.cancels)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default FiberReport;
