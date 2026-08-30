import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingList } from '@/components/shared/LoadingList';
import { formatDistanceToNow } from 'date-fns';

interface LogRow {
  id: string;
  changed_at: string;
  reverted_at: string | null;
  person_name: string | null;
  changed_by_name: string | null;
  carrier_name: string | null;
  vertical: string | null;
  old_rank_name: string | null;
  new_rank_name: string | null;
}

/** Owner and admin lane: every stack change, newest first, with a revert. */
export function StackChangesPanel() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('stack_change_log', { _limit: 100 });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data as LogRow[]) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const revert = async (id: string) => {
    setBusy(id);
    const { data, error } = await (supabase as any).rpc('revert_stack_change', { _log_id: id });
    setBusy(null);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Could not revert that');
      return;
    }
    toast.success('Reverted');
    void load();
  };

  if (loading) return <LoadingList rows={6} />;
  if (rows.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No stack changes yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded border border-border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-foreground">
              {r.changed_by_name || 'Someone'} set {r.person_name || 'a rep'} to{' '}
              {r.new_rank_name || 'no rank'}
              {r.old_rank_name ? ` from ${r.old_rank_name}` : ''}
              {r.carrier_name ? ` on ${r.carrier_name}` : ''}
            </span>
            <span className="block text-[12px] text-muted-foreground">
              {formatDistanceToNow(new Date(r.changed_at), { addSuffix: true })}
              {r.reverted_at ? ' · reverted' : ''}
            </span>
          </span>
          {!r.reverted_at && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy === r.id}
              onClick={() => revert(r.id)}
            >
              Revert
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default StackChangesPanel;
