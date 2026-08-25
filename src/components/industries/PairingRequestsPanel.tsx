import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { Handshake } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface RequestRow {
  id: string;
  rep_id: string;
  rep_name: string | null;
  avatar_url: string | null;
  rep_year: string | null;
  vertical: string;
  label: string;
  created_at: string;
}

/** Pairing requests waiting on the signed-in manager. Hidden when there are none. */
export function PairingRequestsPanel() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_pairing_requests' as never);
    setRows(((data as unknown as { rows: RequestRow[] })?.rows) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: string, accept: boolean, why?: string) => {
    setBusy(id);
    const { data, error } = await supabase.rpc('respond_pairing' as never, {
      _request_id: id,
      _accept: accept,
      _reason: why || null,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not save', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    setDeclining(null);
    setReason('');
    load();
  };

  if (loading || rows.length === 0) return null;

  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center gap-2">
        <Handshake className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Pairing requests</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/50 bg-surface p-3">
            <div className="flex flex-wrap items-center gap-3">
              <UserAvatar fullName={r.rep_name || 'Rep'} avatarUrl={r.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.rep_name || 'Rep'}</p>
                <p className="text-[12px] text-muted-foreground">
                  Wants to work with you in {r.label}
                  {r.rep_year ? ` · ${r.rep_year}` : ''}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" disabled={busy === r.id} onClick={() => respond(r.id, true)}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === r.id}
                  onClick={() => setDeclining(declining === r.id ? null : r.id)}
                >
                  Decline
                </Button>
              </div>
            </div>

            {declining === r.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 min-w-[180px] flex-1 text-[13px]"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => respond(r.id, false, reason)}>
                  Send decline
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PairingRequestsPanel;
