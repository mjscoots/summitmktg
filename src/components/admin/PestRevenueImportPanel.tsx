import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Upload, X } from 'lucide-react';
import { formatCurrency } from '@/lib/commission';
import { MatchTarget, matchName, splitRows, toNum } from '@/lib/importMatch';
import { ImportBatchHistory } from '@/components/admin/ImportBatchHistory';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface Row {
  name: string;
  user_id: string | null;
  revenue: number | null;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Imports the Vision leaderboard revenue rows into rep_revenue by month. */
export function PestRevenueImportPanel({ onIngested }: { onIngested?: () => void }) {
  const [reps, setReps] = useState<MatchTarget[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('archived', false)
      .order('full_name');
    setReps((data as MatchTarget[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parse = (text: string) => {
    const rows: Row[] = [];
    for (const line of splitRows(text)) {
      const [name, revenue] = line;
      if (!name) continue;
      if (/name|rep|total|revenue/i.test(name) && toNum(revenue) === null) continue;
      rows.push({ name, user_id: matchName(name, reps)?.user_id ?? null, revenue: toNum(revenue) });
    }
    if (rows.length === 0) {
      toast.error('Nothing to read — one row per rep: name, serviced revenue');
      return;
    }
    setReview(rows);
  };

  const ready = useMemo(() => (review ?? []).filter((r) => r.user_id && r.revenue !== null), [review]);
  const unmatched = useMemo(() => (review ?? []).filter((r) => !r.user_id), [review]);

  const confirm = async () => {
    if (ready.length === 0) {
      toast.error('No matched rows to load');
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('ingest_pest_revenue', {
      batch: {
        period_label: month,
        note: 'Vision leaderboard revenue',
        rows: ready.map((r) => ({
          user_id: r.user_id,
          month: `${month}-01`,
          revenue: r.revenue,
          serviced_amount: r.revenue,
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
        <h3 className="text-sm font-semibold text-foreground">Import revenue</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the Vision leaderboard rows, or upload the CSV. One row per rep: name, serviced revenue. Pick the
          month first. Nothing is written until you confirm the review.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="h-11 w-[160px] border-white/[0.08] bg-background/60 text-xs sm:h-9"
          />
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
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                const text = await f.text();
                setRaw(text);
                parse(text);
              }
              e.target.value = '';
            }}
          />
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder="Jane Doe, 12500"
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
            {review.map((r, i) => (
              <div key={`${r.name}-${i}`} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                {r.user_id && r.revenue !== null ? (
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
                <span className="ml-auto tabular-nums text-foreground">
                  {r.revenue !== null ? formatCurrency(r.revenue) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ImportBatchHistory kind="pest_revenue" refreshKey={refreshKey} onUndone={onIngested} />
    </div>
  );
}

export default PestRevenueImportPanel;
