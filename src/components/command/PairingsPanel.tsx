import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface PairingRow {
  user_id: string;
  full_name: string | null;
  vertical: string;
  label: string;
  status: string;
  paired_manager: string | null;
  manager_name: string | null;
  pending_request_manager: string | null;
  updated_at: string;
}

interface ManagerRow {
  user_id: string;
  full_name: string | null;
  vertical: string;
  accepting: boolean;
  capacity: number | null;
  mentee_count: number;
}

/** Owner/admin oversight: every enrollment, who it's paired to, and direct reassignment. */
export default function PairingsPanel() {
  const [rows, setRows] = useState<PairingRow[]>([]);
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [fVertical, setFVertical] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fManager, setFManager] = useState('all');

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_pairings' as never, {
      _vertical: fVertical === 'all' ? null : fVertical,
      _status: fStatus === 'all' ? null : fStatus,
      _manager: fManager === 'all' ? null : fManager,
    } as never);
    const res = data as unknown as { rows: PairingRow[]; managers: ManagerRow[] } | null;
    setRows(res?.rows || []);
    setManagers(res?.managers || []);
    setLoading(false);
  }, [fVertical, fStatus, fManager]);

  useEffect(() => {
    load();
  }, [load]);

  const verticals = useMemo(
    () => Array.from(new Set(rows.map((r) => r.vertical))).sort(),
    [rows]
  );
  const unpaired = rows.filter((r) => !r.paired_manager);

  const reassign = async (row: PairingRow, managerId: string) => {
    setBusy(row.user_id + row.vertical);
    const { data, error } = await supabase.rpc('admin_set_paired_manager' as never, {
      _user_id: row.user_id,
      _vertical: row.vertical,
      _manager_id: managerId === 'none' ? null : managerId,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not reassign', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={fVertical} onValueChange={setFVertical}>
            <SelectTrigger className="h-9 w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {(verticals.length ? verticals : ['Pest', 'Fiber', 'Life']).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-9 w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fManager} onValueChange={setFManager}>
            <SelectTrigger className="h-9 w-[190px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name || 'Manager'} ({m.mentee_count}
                  {m.capacity != null ? `/${m.capacity}` : ''})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
        </div>
      </div>

      {unpaired.length > 0 && (
        <div className={cn(CARD, 'border-amber-500/25 bg-amber-500/[0.06]')}>
          <p className="micro-label mb-2 !text-amber-400">Unpaired — {unpaired.length}</p>
          <p className="text-[13px] text-muted-foreground">
            {unpaired.map((r) => `${r.full_name || 'Rep'} (${r.label})`).join(', ')}
          </p>
        </div>
      )}

      <div className={CARD}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3">Rep</th>
                  <th className="pb-2 pr-3">Industry</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Paired with</th>
                  <th className="pb-2">Set manager</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id + r.vertical} className="border-t border-border/40">
                    <td className="py-2 pr-3 text-foreground">{r.full_name || '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.label}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.status}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {r.manager_name
                        || (r.pending_request_manager ? `Waiting on ${r.pending_request_manager}` : 'Unpaired')}
                    </td>
                    <td className="py-2">
                      <Select
                        value={r.paired_manager || 'none'}
                        onValueChange={(v) => reassign(r, v)}
                        disabled={busy === r.user_id + r.vertical}
                      >
                        <SelectTrigger className="h-8 w-[190px] text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unpaired</SelectItem>
                          {managers
                            .filter((m) => m.user_id !== r.user_id)
                            .map((m) => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.full_name || 'Manager'} ({m.mentee_count}
                                {m.capacity != null ? `/${m.capacity}` : ''})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
