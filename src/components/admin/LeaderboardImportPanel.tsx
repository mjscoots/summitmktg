import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertTriangle, Check, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SalesReconcilePanel } from '@/components/admin/SalesReconcilePanel';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface Candidate {
  kind: 'profile' | 'lead';
  id: string;
  name: string | null;
  score: number;
  archived: boolean;
  office: string | null;
  manager: string | null;
  existing_revenue: number | null;
}

interface Row {
  name: string;
  revenue: string;
  serviced: string;
  pending_or_active: string;
  period: string;
  image_index?: string;
  candidates: Candidate[];
  auto_kind: string | null;
  auto_id: string | null;
  /* review state */
  pick: string; // `${kind}:${id}` or ''
  overwrite: boolean;
}

interface BatchLog {
  id: string;
  status: string;
  note: string | null;
  period_label: string | null;
  created_at: string;
  committed_at: string | null;
  extracted: unknown;
  committed_rows: unknown;
  images: { storage_path: string }[];
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? null : `$${Math.round(Number(n)).toLocaleString()}`;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read that file'));
    fr.readAsDataURL(file);
  });
}

export function LeaderboardImportPanel() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [periodMode, setPeriodMode] = useState<'month' | 'ytd'>('month');
  const [period, setPeriod] = useState(currentMonth());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [log, setLog] = useState<BatchLog[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const periodValue = periodMode === 'ytd' ? 'ytd' : period;

  const loadLog = useCallback(async () => {
    const { data } = await supabase
      .from('revenue_import_batches')
      .select('id, status, note, period_label, created_at, committed_at, extracted, committed_rows, revenue_import_images(storage_path)')
      .order('created_at', { ascending: false })
      .limit(10);
    const list = ((data as unknown as (Omit<BatchLog, 'images'> & { revenue_import_images: { storage_path: string }[] })[]) ?? []).map(
      (b) => ({ ...b, images: b.revenue_import_images ?? [] })
    );
    setLog(list);
    const paths = list.flatMap((b) => b.images.map((i) => i.storage_path)).slice(0, 30);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('revenue-imports').createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      setThumbs(map);
    }
  }, []);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  const onPick = async (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).slice(0, 12);
    setFiles(picked);
    setPreviews(await Promise.all(picked.map(fileToDataUrl)));
  };

  const extract = async () => {
    if (previews.length === 0) {
      toast.error('Add at least one screenshot');
      return;
    }
    if (periodMode === 'month' && !/^\d{4}-\d{2}$/.test(period)) {
      toast.error('Pick the month these screenshots cover');
      return;
    }
    setBusy('extract');
    const { data, error } = await supabase.functions.invoke('extract-leaderboard', {
      body: { images: previews },
    });
    if (error || (data as { error?: string })?.error) {
      setBusy(null);
      toast.error((data as { error?: string })?.error || 'Could not read those screenshots');
      return;
    }
    const extracted = ((data as { rows?: Record<string, string>[] }).rows ?? []).map((r) => ({
      ...r,
      period: r.period || periodValue,
    }));
    setNotes((data as { notes?: string[] }).notes ?? []);
    if (extracted.length === 0) {
      setBusy(null);
      toast.error('No rows were readable in those screenshots');
      return;
    }

    const { data: matched, error: mErr } = await (supabase as any).rpc('match_leaderboard_rows', {
      _rows: extracted,
    });
    if (mErr || matched?.error) {
      setBusy(null);
      toast.error(matched?.error || 'Could not match those names');
      return;
    }

    const reviewRows: Row[] = ((matched.rows as Row[]) ?? []).map((r) => ({
      ...r,
      candidates: [...(r.candidates ?? [])].sort((a, b) => Number(b.score) - Number(a.score)),
      pick: r.auto_kind && r.auto_id ? `${r.auto_kind}:${r.auto_id}` : '',
      overwrite: false,
    }));

    // Create the batch and keep the source screenshots for the log.
    const { data: batch, error: bErr } = await supabase
      .from('revenue_import_batches')
      .insert({
        created_by: user?.id ?? '',
        status: 'review',
        note: note.trim() || null,
        period_label: periodValue,
        extracted: extracted as never,
      })
      .select('id')
      .single();

    if (bErr || !batch) {
      setBusy(null);
      toast.error('Could not start that import');
      return;
    }
    setBatchId(batch.id);

    for (let i = 0; i < files.length; i++) {
      const path = `${batch.id}/${i}-${files[i].name.replace(/[^\w.\-]/g, '_')}`;
      const up = await supabase.storage.from('revenue-imports').upload(path, files[i], { upsert: true });
      if (!up.error) {
        await supabase.from('revenue_import_images').insert({ batch_id: batch.id, storage_path: path });
      }
    }

    setRows(reviewRows);
    setBusy(null);
    toast.success('Read — review every row before saving');
  };

  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ? prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)) : prev));

  const matchedRows = useMemo(() => (rows ?? []).filter((r) => r.pick), [rows]);
  const unmatchedRows = useMemo(() => (rows ?? []).filter((r) => !r.pick), [rows]);

  const duplicateName = useMemo(() => {
    const counts = new Map<string, number>();
    matchedRows.forEach((r) => counts.set(r.pick, (counts.get(r.pick) ?? 0) + 1));
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [matchedRows]);

  const commit = async () => {
    if (!rows) return;
    if (matchedRows.length === 0) {
      toast.error('Nothing is matched yet');
      return;
    }
    if (duplicateName.size > 0) {
      toast.error('Two rows point at the same person — fix those first');
      return;
    }
    setBusy('commit');
    const payload = matchedRows.map((r) => {
      const [kind, id] = r.pick.split(':');
      return {
        kind,
        id,
        revenue: r.revenue,
        serviced: r.serviced,
        pending_or_active: r.pending_or_active,
        period: r.period || periodValue,
        overwrite: r.overwrite,
      };
    });
    const { data, error } = await (supabase as any).rpc('apply_leaderboard_import', {
      _batch_id: batchId,
      _rows: payload,
    });
    setBusy(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that import');
      return;
    }
    toast.success(
      `Saved ${data.applied} ${data.applied === 1 ? 'row' : 'rows'}` +
        (data.leads_updated ? ` · ${data.leads_updated} win-back names updated` : '') +
        (data.skipped ? ` · ${data.skipped} skipped` : '')
    );
    setRows(null);
    setBatchId(null);
    setFiles([]);
    setPreviews([]);
    setNotes([]);
    void loadLog();
  };

  const discard = async () => {
    if (batchId) {
      await supabase.from('revenue_import_batches').update({ status: 'discarded' }).eq('id', batchId);
    }
    setRows(null);
    setBatchId(null);
    setNotes([]);
    void loadLog();
  };

  const ReviewRow = ({ r, i }: { r: Row; i: number }) => {
    const picked = r.candidates.find((c) => `${c.kind}:${c.id}` === r.pick);
    const close =
      r.candidates.length > 1 && Number(r.candidates[0].score) - Number(r.candidates[1].score) < 0.15;
    return (
      <div className={cn('space-y-2 border-t border-white/[0.04] p-3', duplicateName.has(r.pick) && 'bg-amber-500/[0.06]')}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-foreground">{r.name}</p>
          <span className="text-[11px] text-muted-foreground">
            from screenshot {Number(r.image_index ?? 0) + 1}
          </span>
          {close && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="h-3 w-3" /> Two close names — confirm which person
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['revenue', 'serviced', 'pending_or_active'] as const).map((f) => (
            <div key={f}>
              <label className="micro-label mb-1 block">
                {f === 'pending_or_active' ? 'Pending / active' : f}
              </label>
              <Input
                inputMode="decimal"
                value={r[f]}
                placeholder="blank"
                onChange={(e) => setRow(i, { [f]: e.target.value } as Partial<Row>)}
                className="h-10 tabular-nums"
              />
            </div>
          ))}
          <div>
            <label className="micro-label mb-1 block">Period</label>
            <Input
              value={r.period}
              placeholder="YYYY-MM or ytd"
              onChange={(e) => setRow(i, { period: e.target.value })}
              className="h-10 tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="micro-label mb-1 block">Match</label>
          <select
            value={r.pick}
            onChange={(e) => setRow(i, { pick: e.target.value, overwrite: false })}
            className="h-10 w-full rounded-lg border border-white/[0.06] bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary/40"
          >
            <option value="">No match — leave this row out</option>
            {r.candidates.map((c) => (
              <option key={`${c.kind}:${c.id}`} value={`${c.kind}:${c.id}`}>
                {c.name} · {c.kind === 'lead' ? 'win-back name' : c.archived ? 'departed' : 'on the roster'} ·{' '}
                {Math.round(Number(c.score) * 100)}% match
                {c.office ? ` · ${c.office}` : ''}
              </option>
            ))}
          </select>
        </div>

        {picked && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              Already recorded for this period:{' '}
              <span className="tabular-nums text-foreground">
                {money(picked.existing_revenue) ?? 'nothing yet'}
              </span>
            </span>
            {picked.existing_revenue != null && (
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={r.overwrite}
                  onChange={(e) => setRow(i, { overwrite: e.target.checked })}
                />
                Replace the saved value
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className={cn(CARD, 'p-4')}>
        <p className="text-sm font-semibold text-foreground">Leaderboard screenshots</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload one or many phone screenshots. Every row is read as printed and nothing is saved until you
          review it.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="micro-label mb-1 block">Screenshots</label>
            <label
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-sm text-muted-foreground'
              )}
            >
              <ImagePlus className="h-4 w-4" />
              {files.length > 0 ? `${files.length} selected` : 'Choose images'}
              <input
                type="file"
                accept="image/png,image/jpeg"
                multiple
                className="hidden"
                onChange={(e) => void onPick(e.target.files)}
              />
            </label>
          </div>
          <div>
            <label className="micro-label mb-1 block">Period these cover</label>
            <div className="flex gap-2">
              <select
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as 'month' | 'ytd')}
                className="h-10 rounded-lg border border-white/[0.06] bg-background/50 px-2 text-sm text-foreground"
              >
                <option value="month">Month</option>
                <option value="ytd">Season to date</option>
              </select>
              {periodMode === 'month' && (
                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10" />
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="micro-label mb-1 block">Note for the log (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" placeholder="e.g. Hawx region leaderboard" />
          </div>
        </div>

        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((p, i) => (
              <img key={i} src={p} alt={`Screenshot ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={extract} disabled={busy !== null}>
            {busy === 'extract' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Read screenshots
          </Button>
          {files.length > 0 && !rows && (
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setPreviews([]);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-[12px] text-amber-400">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {rows && (
        <div className={cn(CARD, 'p-4')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Review — {matchedRows.length} matched, {unmatchedRows.length} unmatched
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={discard}>
                <X className="mr-1.5 h-4 w-4" /> Discard
              </Button>
              <Button size="sm" onClick={commit} disabled={busy !== null}>
                {busy === 'commit' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Save matched rows
              </Button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.06]">
            {rows.map((r, i) => (r.pick ? <ReviewRow key={i} r={r} i={i} /> : null))}
          </div>

          {unmatchedRows.length > 0 && (
            <>
              <p className="micro-label mt-4 mb-1">Unmatched rows — pick a person or leave them out</p>
              <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                {rows.map((r, i) => (!r.pick ? <ReviewRow key={i} r={r} i={i} /> : null))}
              </div>
            </>
          )}
        </div>
      )}

      <div className={cn(CARD, 'p-4')}>
        <p className="text-sm font-semibold text-foreground">Import log</p>
        {log.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {log.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-3">
                <div className="flex gap-1.5">
                  {b.images.slice(0, 4).map((im) =>
                    thumbs[im.storage_path] ? (
                      <img
                        key={im.storage_path}
                        src={thumbs[im.storage_path]}
                        alt="Imported leaderboard screenshot"
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div key={im.storage_path} className="h-12 w-12 rounded bg-white/[0.04]" />
                    )
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground">
                    {b.period_label || 'No period'} ·{' '}
                    {b.status === 'committed' ? 'Saved' : b.status === 'discarded' ? 'Discarded' : 'In review'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()}
                    {b.note ? ` · ${b.note}` : ''} ·{' '}
                    {Array.isArray(b.extracted) ? b.extracted.length : 0} rows read
                    {Array.isArray(b.committed_rows) ? `, ${b.committed_rows.length} saved` : ''}
                  </p>
                </div>
                {b.status === 'review' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await supabase.from('revenue_import_batches').update({ status: 'discarded' }).eq('id', b.id);
                      void loadLog();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SalesReconcilePanel />
    </div>
  );
}
