import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Search, Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/commission';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface MonthRow {
  user_id: string;
  full_name: string | null;
  office: string | null;
  vertical: string | null;
  revenue: number | null;
  serviced_amount: number | null;
  pending_amount: number | null;
}

interface ImportRow {
  name: string;
  month: string;
  revenue: number | null;
  user_id: string | null;
  matched_name: string | null;
}

const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function RevenueEntryPanel() {
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { revenue: string; serviced: string; pending: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<ImportRow[] | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('get_revenue_month', { _month: `${month}-01` });
    if (error) {
      toast.error('Could not load that month');
      setLoading(false);
      return;
    }
    const list = (data?.rows as MonthRow[]) ?? [];
    setRows(list);
    setDrafts(
      list.reduce((acc, r) => {
        acc[r.user_id] = {
          revenue: r.revenue != null ? String(r.revenue) : '',
          serviced: r.serviced_amount != null ? String(r.serviced_amount) : '',
          pending: r.pending_amount != null ? String(r.pending_amount) : '',
        };
        return acc;
      }, {} as Record<string, { revenue: string; serviced: string; pending: string }>)
    );
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.full_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const entered = rows.filter((r) => r.revenue != null).length;
  const monthTotal = rows.reduce(
    (sum, r) => sum + Math.max((r.serviced_amount ?? 0) + (r.pending_amount ?? 0), r.revenue ?? 0),
    0
  );

  const save = async (userId: string) => {
    const d = drafts[userId];
    if (!d) return;
    setSaving(userId);
    const { data, error } = await (supabase as any).rpc('upsert_rep_revenue', {
      _user_id: userId,
      _month: `${month}-01`,
      _revenue: num(d.revenue) ?? 0,
      _serviced: num(d.serviced),
      _pending: num(d.pending),
    });
    setSaving(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that number');
      return;
    }
    toast.success('Saved');
    load();
  };

  const parseRaw = () => {
    const parsed = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const [name, mo, rev] = parts.map((p) => p.trim());
        return { name, month: mo, revenue: num(rev || '') };
      })
      .filter((r) => r.name && r.month);
    return parsed;
  };

  const runMatch = async () => {
    const parsed = parseRaw();
    if (parsed.length === 0) {
      toast.error('Nothing to import — one row per line: name, month (YYYY-MM), revenue');
      return;
    }
    const normalized = parsed.map((r) => ({
      ...r,
      month: /^\d{4}-\d{2}$/.test(r.month) ? `${r.month}-01` : r.month,
    }));
    setImportBusy(true);
    const { data, error } = await (supabase as any).rpc('match_revenue_import', { _rows: normalized });
    setImportBusy(false);
    if (error) {
      toast.error('Could not match those rows');
      return;
    }
    setReview((data?.rows as ImportRow[]) ?? []);
  };

  const commit = async () => {
    if (!review) return;
    const matched = review.filter((r) => r.user_id);
    if (matched.length === 0) {
      toast.error('No matched rows to commit');
      return;
    }
    setImportBusy(true);
    const { data, error } = await (supabase as any).rpc('apply_revenue_import', { _rows: matched });
    setImportBusy(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Import failed');
      return;
    }
    toast.success(`Saved ${data.applied} ${data.applied === 1 ? 'row' : 'rows'}`);
    setReview(null);
    setRaw('');
    setImportOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className={cn(CARD, 'p-4')}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="micro-label mb-1 block">Month</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 w-[160px]"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="micro-label mb-1 block">Find a rep</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <Button variant="outline" className="h-10" onClick={() => setImportOpen((v) => !v)}>
            <Upload className="mr-1.5 h-4 w-4" /> CSV import
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Entered: <span className="tabular-nums text-foreground">{entered}</span> of {rows.length}
          </span>
          <span>
            Month total:{' '}
            <span className="tabular-nums text-foreground">
              {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
            </span>
          </span>
        </div>
      </div>

      {importOpen && (
        <div className={cn(CARD, 'p-4')}>
          <p className="text-sm font-semibold text-foreground">Paste rows</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One row per line: name, month (YYYY-MM), revenue. Nothing saves until you review the matches.
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            placeholder={'Jane Smith, 2026-06, 18400\nJohn Doe, 2026-06, 12250'}
            className="mt-3 w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={runMatch} disabled={importBusy}>
              {importBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Review matches
            </Button>
            {review && (
              <Button variant="outline" onClick={() => setReview(null)}>
                Clear review
              </Button>
            )}
          </div>

          {review && (
            <div className="mt-4">
              <p className="micro-label mb-2">
                Review — {review.filter((r) => r.user_id).length} matched, {review.filter((r) => !r.user_id).length}{' '}
                unmatched
              </p>
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card/95">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Pasted name</th>
                      <th className="px-3 py-2 font-medium">Matched to</th>
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.map((r, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-3 py-2 text-foreground">{r.name}</td>
                        <td className="px-3 py-2">
                          {r.user_id ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Check className="h-3 w-3" /> {r.matched_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <X className="h-3 w-3" /> No match — skipped
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.month}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {r.revenue != null ? formatCurrency(r.revenue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-3" onClick={commit} disabled={importBusy}>
                {importBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Commit matched rows
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className={cn(CARD, 'divide-y divide-white/[0.04]')}>
          {filtered.map((r) => {
            const d = drafts[r.user_id] ?? { revenue: '', serviced: '', pending: '' };
            return (
              <div key={r.user_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 sm:w-56">
                  <p className="truncate text-sm font-semibold text-foreground">{r.full_name || '—'}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[r.office, r.vertical].filter(Boolean).join(' · ') || ' '}
                  </p>
                </div>
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {(['revenue', 'serviced', 'pending'] as const).map((f) => (
                    <div key={f}>
                      <label className="micro-label mb-1 block capitalize">{f}</label>
                      <Input
                        inputMode="decimal"
                        value={d[f]}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [r.user_id]: { ...d, [f]: e.target.value } }))
                        }
                        placeholder={f === 'revenue' ? '0' : 'optional'}
                        className="h-10 tabular-nums"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="h-10 sm:mt-5"
                  onClick={() => save(r.user_id)}
                  disabled={saving === r.user_id}
                >
                  {saving === r.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No reps match that search.</p>
          )}
        </div>
      )}
    </div>
  );
}
