import { useCallback, useEffect, useState } from 'react';
import { Database, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

type Snapshot = {
  id: string;
  storage_path: string;
  file_bytes: number;
  table_count: number;
  row_count: number;
  trigger_source: string;
  created_at: string;
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BackupsPanel() {
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('backup_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error(error);
    } else {
      setRows((data || []) as Snapshot[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshotNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('db-backup', { body: {} });
      if (error) throw error;
      const result = data as { tables?: number; rows?: number } | null;
      toast.success(
        result?.tables
          ? `Snapshot saved — ${result.tables} tables, ${(result.rows ?? 0).toLocaleString()} rows`
          : 'Snapshot saved'
      );
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Snapshot failed. Try again in a moment.');
    } finally {
      setRunning(false);
    }
  };

  const downloadSnapshot = async (snap: Snapshot) => {
    setDownloading(snap.id);
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .createSignedUrl(snap.storage_path, 120);
      if (error || !data?.signedUrl) throw error || new Error('No URL');
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = snap.storage_path.split('/').pop() || 'summit-backup.json';
      a.click();
    } catch (err) {
      console.error(err);
      toast.error('Download failed — backup files are owner-only.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className={cn(CARD, 'p-4 sm:col-span-2')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/30">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Backups</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A full JSON snapshot of core tables runs automatically every Sunday and the eight most recent are kept.
              Files are stored privately and only the owner can download them.
            </p>
          </div>
        </div>
        <button
          onClick={snapshotNow}
          disabled={running}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-primary/40 px-3 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Snapshot now
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading backups
          </div>
        ) : rows.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">
            No backups yet. The first automatic snapshot runs Sunday, or take one now.
          </p>
        ) : (
          rows.map((snap) => (
            <div
              key={snap.id}
              className="flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground stat-num">{formatWhen(snap.created_at)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground stat-num">
                  {snap.table_count} tables · {snap.row_count.toLocaleString()} rows · {formatBytes(snap.file_bytes)} ·{' '}
                  {snap.trigger_source === 'manual' ? 'manual' : 'scheduled'}
                </p>
              </div>
              <button
                onClick={() => downloadSnapshot(snap)}
                disabled={downloading !== null}
                className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50">
                {downloading === snap.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
