import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface Batch {
  id: string;
  kind: string;
  status: string;
  period_label: string | null;
  note: string | null;
  rows: number;
  created_at: string;
  created_by_name: string | null;
}

/** Past imports for one kind, with a clean undo per batch. */
export function ImportBatchHistory({
  kind,
  refreshKey,
  onUndone,
}: {
  kind: 'fiber_week' | 'pest_revenue';
  refreshKey?: number;
  onUndone?: () => void;
}) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('get_import_batches', { _kind: kind });
    setBatches((data as Batch[]) ?? []);
  }, [kind]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const undo = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc('undo_import_batch', { _batch_id: id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Batch reversed');
    await load();
    onUndone?.();
  };

  if (batches.length === 0) return null;

  return (
    <div className={CARD}>
      <h3 className="text-sm font-semibold text-foreground">Past imports</h3>
      <div className="mt-2 divide-y divide-white/[0.05]">
        {batches.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
            <span className="text-foreground">
              {new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-muted-foreground">{b.period_label || '—'}</span>
            <span className="tabular-nums text-muted-foreground">{b.rows} rows</span>
            <span className="text-muted-foreground">{b.created_by_name || '—'}</span>
            <span
              className={cn(
                'ml-auto',
                b.status === 'committed' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {b.status === 'committed' ? 'loaded' : 'reversed'}
            </span>
            {b.status === 'committed' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                disabled={busy === b.id}
                onClick={() => undo(b.id)}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo batch
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImportBatchHistory;
