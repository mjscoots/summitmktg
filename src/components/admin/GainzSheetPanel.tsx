import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/commission';
import { MatchTarget, matchName, mondayOf, splitRows, toInt, toNum } from '@/lib/importMatch';
import { ImportBatchHistory } from '@/components/admin/ImportBatchHistory';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface Row {
  name: string;
  user_id: string | null;
  installs: number | null;
  gross: number | null;
  overrides: number | null;
  costs: number | null;
  week_start: string;
}

/**
 * Loads a Gainz weekly itemized pay sheet: paste rows or upload the CSV export.
 * Nothing is written until the review step is confirmed.
 */
export function GainzSheetPanel({ onIngested }: { onIngested?: () => void }) {
  const [reps, setReps] = useState<MatchTarget[]>([]);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [carrierId, setCarrierId] = useState('');
  const [week, setWeek] = useState(mondayOf(new Date()));
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from('carriers').select('id, name').eq('vertical', 'Fiber').eq('active', true).order('name'),
      supabase.from('profiles').select('user_id, full_name').eq('archived', false).order('full_name'),
    ]);
    setCarriers((c.data as any[]) ?? []);
    setCarrierId((prev) => prev || (c.data?.[0] as any)?.id || '');
    setReps((p.data as MatchTarget[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parse = (text: string) => {
    const cells = splitRows(text);
    const rows: Row[] = [];
    for (const line of cells) {
      const [name, accounts, gross, overrides, costs, wk] = line;
      if (!name) continue;
      if (/name|rep|total/i.test(name) && toInt(accounts) === null && toNum(gross) === null) continue;
      const dated = wk && /^\d{4}-\d{2}-\d{2}$/.test(wk) ? mondayOf(new Date(`${wk}T00:00:00`)) : week;
      const match = matchName(name, reps);
      rows.push({
        name,
        user_id: match?.user_id ?? null,
        installs: toInt(accounts),
        gross: toNum(gross),
        overrides: toNum(overrides),
        costs: toNum(costs),
        week_start: dated,
      });
    }
    if (rows.length === 0) {
      toast.error('Nothing to read — one row per rep: name, accounts, gross, overrides, costs, week');
      return;
    }
    setReview(rows);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    parse(text);
  };

  const ready = useMemo(() => (review ?? []).filter((r) => r.user_id && r.installs !== null), [review]);
  const unmatched = useMemo(() => (review ?? []).filter((r) => !r.user_id), [review]);

  const confirm = async () => {
    if (ready.length === 0) {
      toast.error('No matched rows to load');
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('ingest_fiber_week', {
      batch: {
        carrier_id: carrierId || null,
        period_label: `Week of ${week}`,
        note: 'Gainz weekly sheet',
        rows: ready.map((r) => ({
          user_id: r.user_id,
          week_start: r.week_start,
          installs: r.installs,
          cancels: 0,
          gross: r.gross,
          overrides: r.overrides,
          costs: r.costs,
        })),
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Loaded ${data?.applied ?? ready.length} rows`);
    setReview(null);
    setRaw('');
    setRefreshKey((k) => k + 1);
    onIngested?.();
  };

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Load weekly sheet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the Gainz weekly itemized pay sheet, or upload the CSV export. One row per rep: name, accounts,
          gross pay, overrides, costs, week. Nothing is written until you confirm the review.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={week}
            onChange={(e) => setWeek(mondayOf(new Date(`${e.target.value}T00:00:00`)))}
            className="h-11 w-[150px] border-white/[0.08] bg-background/60 text-xs sm:h-9"
          />
          <select
            value={carrierId}
            onChange={(e) => setCarrierId(e.target.value)}
            className="h-11 rounded-lg border border-white/[0.08] bg-background/60 px-2 text-xs text-foreground sm:h-9"
          >
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-11 gap-1 text-xs sm:h-9"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Upload CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder="Jane Doe, 7, 1400, 0, 120, 2026-08-24"
          className="mt-3 w-full resize-none rounded-lg border border-white/[0.08] bg-background/60 p-2 text-xs text-foreground"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" className="h-11 text-xs sm:h-9" onClick={() => parse(raw)}>
            Review rows
          </Button>
          {review && (
            <Button
              size="sm"
              variant="outline"
              className="h-11 text-xs sm:h-9"
              disabled={busy || ready.length === 0}
              onClick={confirm}
            >
              Confirm {ready.length} matched {ready.length === 1 ? 'row' : 'rows'}
            </Button>
          )}
        </div>
      </div>

      {review && (
        <div className={CARD}>
          <p className="text-xs text-muted-foreground">
            {ready.length} matched · {unmatched.length} need a rep. Pick a rep for any unmatched name, or leave it
            out.
          </p>
          <div className="mt-2 divide-y divide-white/[0.05]">
            {review.map((r, i) => {
              const ok = !!r.user_id && r.installs !== null;
              return (
                <div key={`${r.name}-${i}`} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                  {ok ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="text-foreground">{r.name}</span>
                  <select
                    value={r.user_id ?? ''}
                    onChange={(e) =>
                      setReview((prev) =>
                        (prev ?? []).map((row, idx) =>
                          idx === i ? { ...row, user_id: e.target.value || null } : row
                        )
                      )
                    }
                    className="h-9 max-w-[180px] rounded-lg border border-white/[0.08] bg-background/60 px-2 text-xs text-foreground"
                  >
                    <option value="">Not matched</option>
                    {reps.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.full_name || '—'}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">{r.week_start}</span>
                  <span className="ml-auto tabular-nums text-foreground">
                    {r.installs ?? '—'} accounts
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.gross !== null ? formatCurrency(r.gross) : '—'} gross
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.overrides !== null ? formatCurrency(r.overrides) : '—'} overrides
                  </span>
                  <span className={cn('tabular-nums text-muted-foreground')}>
                    {r.costs !== null ? formatCurrency(r.costs) : '—'} costs
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ImportBatchHistory kind="fiber_week" refreshKey={refreshKey} onUndone={onIngested} />
    </div>
  );
}

export default GainzSheetPanel;
