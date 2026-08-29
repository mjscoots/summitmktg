import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';

interface QueueRow {
  id: string;
  full_name: string;
  phone: string | null;
  former_manager_name: string | null;
  team_name: string | null;
  season_revenue: number | null;
  manager_gone: boolean;
}

/**
 * Owner and admin only. Leads with no confident manager match, assigned in one
 * tap. Matching, routing and assignment all run inside secure functions.
 */
export function OwnerAssignQueue({
  managers,
  onChanged,
}: {
  managers: { user_id: string; full_name: string | null }[];
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('lead_assignment_queue', { _limit: 50 });
    if (!error) setRows((data as QueueRow[]) || []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = async (leadId: string, to: string) => {
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('lead_assign_to_manager', {
      _lead_id: leadId,
      _to: to,
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(error?.message || 'Could not assign that lead');
      return;
    }
    toast.success('Assigned');
    setRows((prev) => prev.filter((r) => r.id !== leadId));
    onChanged();
  };

  const route = async () => {
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('route_people_leads');
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${data?.routed ?? 0} sent to their manager`);
    void load();
    onChanged();
  };

  if (!loaded) return null;

  return (
    <section className={cn(CARD, 'mb-3 p-3')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Needs an owner</p>
          <p className="text-[12px] text-muted-foreground tabular-nums">
            {rows.length} with no clear manager match
          </p>
        </div>
        <button
          onClick={route}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-xl border border-border/60 px-3 text-[13px] font-semibold text-foreground disabled:opacity-50"
        >
          Route the matched ones
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">Nothing waiting right now</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{r.full_name}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {[
                    r.former_manager_name ? `Was with ${r.former_manager_name}` : 'No former manager on file',
                    r.manager_gone ? 'That manager is gone' : null,
                    r.team_name,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Select onValueChange={(v) => assign(r.id, v)} disabled={busy}>
                <SelectTrigger aria-label={`Assign ${r.full_name}`} className="h-11 w-[160px] shrink-0 text-[12px]">
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                      {m.full_name || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default OwnerAssignQueue;
