import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, Upload, ChevronDown } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface Row {
  name: string;
  revenue: string | null;
  weeks: string | null;
  last_sale: string | null;
  note: string | null;
  lead_id: string | null;
  lead_name: string | null;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const first = lines[0].toLowerCase();
  const body = /name/.test(first) && /revenue|weeks|sale/.test(first) ? lines.slice(1) : lines;
  return body.map((line) => {
    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      name: cells[0] || '',
      revenue: cells[1] || null,
      weeks: cells[2] || null,
      last_sale: cells[3] || null,
      note: cells[4] || null,
    };
  }).filter((r) => r.name);
}

export function WinbackGoldImport({ onApplied }: { onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const review = async () => {
    const parsed = parseCsv(raw);
    if (parsed.length === 0) { toast.error('Nothing to import - paste rows first'); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('match_winback_gold', { _rows: parsed });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error || 'Could not match those rows'); return; }
    setRows((data.rows as Row[]) || []);
  };

  const commit = async () => {
    if (!rows) return;
    const matched = rows.filter((r) => r.lead_id);
    if (matched.length === 0) { toast.error('No matched rows to commit'); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('apply_winback_gold', { _rows: matched });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error || 'Could not apply those rows'); return; }
    toast.success(`Updated ${data.applied ?? matched.length} win-back ${(data.applied ?? matched.length) === 1 ? 'row' : 'rows'}`);
    setRows(null);
    setRaw('');
    onApplied();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setRaw(await file.text());
    setRows(null);
  };

  const matchedCount = rows?.filter((r) => r.lead_id).length ?? 0;
  const unmatched = rows?.filter((r) => !r.lead_id) ?? [];

  return (
    <section className={cn(CARD, 'p-4')}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[14px] font-bold text-foreground">
          <Upload className="h-4 w-4 text-primary" /> Import production data
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-muted-foreground">
            Columns: name, revenue, weeks active, last sale date, note. Matched by name - review before committing.
          </p>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setRows(null); }}
            rows={5}
            placeholder="Jordan, 42000, 11, 2025-08-02, Left early for school"
            className="w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="micro-label inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border/60 bg-surface px-3 hover:border-primary/30 hover:text-foreground">
              Upload CSV
              <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button
              onClick={review}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && !rows ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Review matches
            </button>
          </div>

          {rows && (
            <div className="space-y-3">
              <p className="micro-label">
                {matchedCount} matched · {unmatched.length} unmatched
              </p>
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-card/95 text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold">Name</th>
                      <th className="px-2 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-2 py-2 text-right font-semibold">Weeks</th>
                      <th className="px-2 py-2 text-left font-semibold">Last sale</th>
                      <th className="px-2 py-2 text-left font-semibold">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {rows.map((r, i) => (
                      <tr key={i} className={cn(!r.lead_id && 'opacity-60')}>
                        <td className="px-2 py-2 text-foreground">{r.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{r.revenue || ''}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{r.weeks || ''}</td>
                        <td className="px-2 py-2 text-muted-foreground">{r.last_sale || ''}</td>
                        <td className="px-2 py-2">
                          {r.lead_id ? (
                            <span className="text-emerald-400">{r.lead_name}</span>
                          ) : (
                            <span className="text-amber-400">No win-back row</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={commit}
                disabled={busy || matchedCount === 0}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Commit {matchedCount} matched {matchedCount === 1 ? 'row' : 'rows'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
