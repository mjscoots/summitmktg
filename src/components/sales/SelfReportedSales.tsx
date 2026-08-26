import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaleRow {
  id: string;
  sold_at: string;
  plan: string | null;
  city: string | null;
  initial: number | null;
  notes: string | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Last ten self-reported sales for one person. A manager can correct or remove
 * a wrong entry; the reason is kept in the entry's notes.
 */
export function SelfReportedSales({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('sales_log')
      .select('id, sold_at, plan, city, initial, notes')
      .eq('user_id', userId)
      .order('sold_at', { ascending: false })
      .limit(10);
    setRows((data as SaleRow[]) || []);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveReason(id: string, remove: boolean) {
    if (!reason.trim()) {
      toast.error('Add a reason first.');
      return;
    }
    const row = rows.find((r) => r.id === id);
    const note = [row?.notes, `Correction: ${reason.trim()}`].filter(Boolean).join('\n');
    const upd = await (supabase as any).from('sales_log').update({ notes: note }).eq('id', id);
    let failed = Boolean(upd.error);
    if (!failed && remove) {
      const del = await (supabase as any).from('sales_log').delete().eq('id', id);
      failed = Boolean(del.error);
    }
    if (failed) {
      toast.error('That did not save.');
      return;
    }
    setEditing(null);
    setReason('');
    await load();
    toast.success(remove ? 'Entry removed' : 'Note saved');
  }

  if (rows.length === 0) return null;

  return (
    <Card className="p-4">
      {rows.map((r) => (
        <div key={r.id} className="border-b border-border/40 py-2 last:border-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-foreground">
              {r.plan || 'Plan'}
              {r.city ? ` · ${r.city}` : ''}
            </span>
            <span className="text-[13px] tabular-nums text-muted-foreground">{fmt(r.sold_at)}</span>
          </div>
          {canEdit && (
            <div className="mt-1">
              {editing === r.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason"
                    className="h-11 max-w-[200px]"
                  />
                  <Button size="sm" className="min-h-11" onClick={() => void saveReason(r.id, false)}>
                    Save note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void saveReason(r.id, true)}
                  >
                    Remove entry
                  </Button>
                  <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditing(r.id);
                    setReason('');
                  }}
                  className="min-h-11 text-[13px] text-muted-foreground"
                >
                  Correct this entry
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

export default SelfReportedSales;
