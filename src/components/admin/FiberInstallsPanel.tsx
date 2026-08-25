import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingList } from '@/components/shared/LoadingList';
import { Check, Search, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface Rep { user_id: string; full_name: string | null }
interface Carrier { id: string; name: string }
interface Row { user_id: string; carrier_id: string; installs: number; cancels: number }
interface ImportRow {
  name: string;
  carrier: string;
  week: string;
  installs: number | null;
  cancels: number | null;
  user_id: string | null;
  carrier_id: string | null;
}

const int = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
};

function mondayOf(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy.toISOString().slice(0, 10);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Weekly fiber installs and cancels. Admins cover everyone, managers their paired reps. */
export function FiberInstallsPanel() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  const [week, setWeek] = useState(mondayOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState<Rep[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierId, setCarrierId] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { installs: string; cancels: string }>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadBase = useCallback(async () => {
    const { data: cs } = await supabase
      .from('carriers')
      .select('id, name')
      .eq('vertical', 'Fiber')
      .eq('active', true)
      .order('name');
    setCarriers((cs as Carrier[]) ?? []);
    setCarrierId((prev) => prev || (cs?.[0]?.id ?? ''));

    if (isAdmin) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('archived', false)
        .order('full_name');
      setReps((data as Rep[]) ?? []);
    } else {
      const { data: enr } = await supabase
        .from('rep_vertical_enrollments')
        .select('user_id')
        .eq('vertical', 'Fiber');
      const ids = Array.from(new Set((enr ?? []).map((e: any) => e.user_id)));
      if (ids.length === 0) { setReps([]); return; }
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids)
        .eq('archived', false)
        .order('full_name');
      setReps((data as Rep[]) ?? []);
    }
  }, [isAdmin]);

  const loadWeek = useCallback(async () => {
    if (!carrierId) return;
    setLoading(true);
    const { data } = await supabase
      .from('fiber_installs')
      .select('user_id, carrier_id, installs, cancels')
      .eq('week_start', week)
      .eq('carrier_id', carrierId);
    const list = (data as Row[]) ?? [];
    setRows(list);
    setDrafts(
      list.reduce((acc, r) => {
        acc[r.user_id] = { installs: String(r.installs), cancels: String(r.cancels) };
        return acc;
      }, {} as Record<string, { installs: string; cancels: string }>)
    );
    setLoading(false);
  }, [week, carrierId]);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter((r) => (r.full_name || '').toLowerCase().includes(q));
  }, [reps, search]);

  const save = async (userId: string) => {
    const d = drafts[userId];
    const installs = int(d?.installs ?? '');
    if (installs === null) { toast.error('Enter installs for that week'); return; }
    setSaving(userId);
    const { error } = await supabase
      .from('fiber_installs')
      .upsert(
        {
          user_id: userId,
          carrier_id: carrierId,
          week_start: week,
          installs,
          cancels: int(d?.cancels ?? '') ?? 0,
        },
        { onConflict: 'user_id,carrier_id,week_start' }
      );
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    loadWeek();
  };

  const runMatch = () => {
    const parsed = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = (line.includes('\t') ? line.split('\t') : line.split(',')).map((p) => p.trim());
        const [name, carrier, wk, ins, can] = parts;
        const rep = reps.find((r) => norm(r.full_name || '') === norm(name || ''));
        const c = carriers.find((x) => norm(x.name) === norm(carrier || ''));
        return {
          name: name || '',
          carrier: carrier || '',
          week: /^\d{4}-\d{2}-\d{2}$/.test(wk || '') ? mondayOf(new Date(`${wk}T00:00:00`)) : '',
          installs: int(ins || ''),
          cancels: int(can || ''),
          user_id: rep?.user_id ?? null,
          carrier_id: c?.id ?? null,
        };
      })
      .filter((r) => r.name);
    if (parsed.length === 0) {
      toast.error('Nothing to import — one row per line: name, carrier, week (YYYY-MM-DD), installs, cancels');
      return;
    }
    setReview(parsed);
  };

  const commit = async () => {
    const ok = (review ?? []).filter((r) => r.user_id && r.carrier_id && r.week && r.installs !== null);
    if (ok.length === 0) { toast.error('No matched rows to import'); return; }
    setBusy(true);
    const { error } = await supabase.from('fiber_installs').upsert(
      ok.map((r) => ({
        user_id: r.user_id!,
        carrier_id: r.carrier_id!,
        week_start: r.week,
        installs: r.installs!,
        cancels: r.cancels ?? 0,
      })),
      { onConflict: 'user_id,carrier_id,week_start' }
    );
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${ok.length} rows`);
    setReview(null);
    setRaw('');
    setImportOpen(false);
    loadWeek();
  };

  const entered = rows.length;

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Fiber installs</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a week, then enter installs and cancels per rep. Reps see their own weeks on My Money.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={week}
            onChange={(e) => setWeek(mondayOf(new Date(`${e.target.value}T00:00:00`)))}
            className="h-8 w-[150px] border-white/[0.08] bg-background/60 text-xs"
          />
          <select
            value={carrierId}
            onChange={(e) => setCarrierId(e.target.value)}
            className="h-8 rounded-lg border border-white/[0.08] bg-background/60 px-2 text-xs text-foreground"
          >
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Week of {week} · {entered} entered</span>
          <Button size="sm" variant="outline" className="ml-auto h-8 gap-1 text-xs" onClick={() => setImportOpen((v) => !v)}>
            <Upload className="h-3.5 w-3.5" /> Paste import
          </Button>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reps..."
            className="border-white/[0.08] bg-background/50 pl-9"
          />
        </div>
      </div>

      {importOpen && (
        <div className={CARD}>
          <p className="text-xs text-muted-foreground">
            One row per line: name, carrier, week (YYYY-MM-DD), installs, cancels. Review before it commits.
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-background/60 p-2 text-xs text-foreground"
            placeholder="Jane Doe, Sonic, 2026-08-24, 7, 1"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={runMatch}>Review</Button>
            {review && (
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy} onClick={commit}>
                Commit matched rows
              </Button>
            )}
          </div>
          {review && (
            <div className="mt-3 divide-y divide-white/[0.05]">
              {review.map((r, i) => {
                const ok = r.user_id && r.carrier_id && r.week && r.installs !== null;
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                    {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    <span className="text-foreground">{r.name}</span>
                    <span className="text-muted-foreground">{r.carrier || 'no carrier'}</span>
                    <span className="text-muted-foreground">{r.week || 'no week'}</span>
                    <span className="ml-auto tabular-nums text-foreground">
                      {r.installs ?? '—'} installs · {r.cancels ?? 0} cancels
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingList rows={6} />
      ) : (
        <div className={cn(CARD, 'divide-y divide-white/[0.05] !p-0')}>
          {filtered.map((rep) => {
            const d = drafts[rep.user_id] ?? { installs: '', cancels: '' };
            return (
              <div key={rep.user_id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{rep.full_name || '—'}</span>
                <Input
                  value={d.installs}
                  onChange={(e) => setDrafts((p) => ({ ...p, [rep.user_id]: { ...d, installs: e.target.value } }))}
                  placeholder="installs"
                  className="h-8 w-24 border-white/[0.08] bg-background/60 text-xs tabular-nums"
                />
                <Input
                  value={d.cancels}
                  onChange={(e) => setDrafts((p) => ({ ...p, [rep.user_id]: { ...d, cancels: e.target.value } }))}
                  placeholder="cancels"
                  className="h-8 w-24 border-white/[0.08] bg-background/60 text-xs tabular-nums"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  disabled={saving === rep.user_id}
                  onClick={() => save(rep.user_id)}
                >
                  Save
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No reps found</p>
          )}
        </div>
      )}
    </div>
  );
}

export default FiberInstallsPanel;
