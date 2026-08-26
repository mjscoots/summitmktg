import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RequestRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  vertical: string | null;
  worked_under: string | null;
  notes: string | null;
  status: string;
  reset_row_id: string | null;
  created_at: string;
}

/** Reactivation requests from people whose access was reset. */
export default function ReactivationRequestsPanel({ onRestored }: { onRestored?: () => void }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_reactivation_requests');
    setRows((data as unknown as RequestRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (row: RequestRow) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('restore_access', {
      _user_id: row.user_id,
      _role: null,
      _manager: null,
      _owner_override: false,
    });
    setBusy(false);
    const res = data as { success?: boolean; error?: string; role?: string } | null;
    if (error || !res?.success) {
      toast({ title: res?.error || error?.message || 'Restore failed', variant: 'destructive' });
      return;
    }
    toast({ title: `${row.full_name} restored as ${res.role}` });
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    onRestored?.();
  };

  const dismiss = async (row: RequestRow) => {
    setBusy(true);
    await supabase.rpc('dismiss_reactivation_request', { _id: row.id });
    setBusy(false);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No reactivation requests.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="text-sm">
            <div className="font-medium text-foreground">{r.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {[r.phone, r.vertical, r.worked_under ? `under ${r.worked_under}` : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(r.created_at), 'MMM d, h:mm a')}
              {r.reset_row_id ? ' · matched to reset row' : ' · no reset row'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => restore(r)}>
              Restore
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => dismiss(r)}>
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
