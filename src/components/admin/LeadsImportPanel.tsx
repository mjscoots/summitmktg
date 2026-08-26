import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';

interface PreviewRow {
  row: Record<string, string>;
  full_name: string;
  match: 'exact' | 'first_last' | 'fuzzy' | 'new';
  score: number | null;
  lead_id: string | null;
  existing_name: string | null;
}

type Action = 'update' | 'create' | 'skip';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
}

/** Admin -> People -> Import leads. Matches a pasted sheet against existing leads first. */
export default function LeadsImportPanel() {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [actions, setActions] = useState<Record<number, Action>>({});
  const [busy, setBusy] = useState(false);

  const runPreview = async () => {
    const rows = parseCsv(raw);
    if (rows.length === 0) {
      toast.error('Paste a header row and at least one data row');
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('leads_import_preview', { _rows: rows });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data as PreviewRow[]) || [];
    setPreview(list);
    const next: Record<number, Action> = {};
    list.forEach((r, i) => {
      next[i] = r.match === 'new' ? 'create' : r.match === 'fuzzy' ? 'skip' : 'update';
    });
    setActions(next);
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    const decisions = preview.map((r, i) => ({
      action: actions[i] ?? 'skip',
      lead_id: r.lead_id,
      row: r.row,
    }));
    const { data, error } = await (supabase.rpc as any)('leads_import_commit', { _decisions: decisions });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as { created: number; updated: number };
    toast.success(`${res.created} created, ${res.updated} updated`);
    setPreview(null);
    setRaw('');
  };

  return (
    <div className={cn(CARD, 'p-4')}>
      <p className="micro-label mb-2">Import leads</p>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Paste CSV with a header row. Recognised columns: full_name, phone, email, system, roster_status,
        former_manager_name, recruiter_name, team_name, season_revenue.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
        placeholder="full_name,phone,season_revenue"
        className="w-full resize-y rounded-lg border border-border/60 bg-background/50 px-3 py-2 font-mono text-[12px] outline-none focus:border-primary/40"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={runPreview}
          disabled={busy || !raw.trim()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Preview matches
        </button>
        {preview && (
          <button
            onClick={commit}
            disabled={busy}
            className="min-h-11 rounded-xl border border-border/60 bg-background/50 px-3 text-[13px] font-semibold disabled:opacity-60"
          >
            Apply {preview.filter((_, i) => (actions[i] ?? 'skip') !== 'skip').length} rows
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-4 space-y-2">
          {preview.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{r.full_name}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {r.match === 'new'
                    ? 'No existing lead'
                    : `${r.match.replace('_', ' ')} match: ${r.existing_name}${
                        r.score != null ? ` (${Number(r.score).toFixed(2)})` : ''
                      }`}
                </p>
              </div>
              <div className="flex gap-1">
                {(['update', 'create', 'skip'] as Action[]).map((a) => (
                  <button
                    key={a}
                    disabled={a === 'update' && !r.lead_id}
                    onClick={() => setActions((p) => ({ ...p, [i]: a }))}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40',
                      (actions[i] ?? 'skip') === a
                        ? 'border-primary/40 bg-primary text-primary-foreground'
                        : 'border-border/60 text-muted-foreground'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
