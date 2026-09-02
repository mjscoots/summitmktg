import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingList } from '@/components/shared/LoadingList';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import PlacePersonSheet from '@/components/onboarding/PlacePersonSheet';

interface WaitingPerson {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  manager_name: string | null;
  team_name: string | null;
  invited_vertical: string | null;
  day_one_done?: boolean | null;
  day_one_done_at?: string | null;
}


const INDUSTRIES = ['Pest', 'Fiber', 'Life'] as const;

/**
 * Pass 149 - new people land here until the owner places them in an industry.
 * One tap writes the membership row, which is what opens that industry's room,
 * screens and lists for them.
 */
export function AwaitingIndustryPanel() {
  const [rows, setRows] = useState<WaitingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [placing, setPlacing] = useState<WaitingPerson | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('people_awaiting_industry' as never);
    setRows(((data as unknown as WaitingPerson[]) || []));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (userId: string, vertical: string) => {
    setBusy(`${userId}-${vertical}`);
    const { data, error } = await supabase.rpc('accept_into_industry' as never, {
      _user_id: userId,
      _vertical: vertical,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not accept that person',
        description: res?.error || error?.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: `Accepted into ${vertical}` });
    void load();
  };

  if (loading) return <LoadingList rows={3} />;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Nobody is waiting to be placed in an industry.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Waiting to be placed</p>
        <p className="mt-1 text-xs text-muted-foreground">
          These people can only see Summit Trinity chat until you pick their industry.
        </p>
      </div>

      {rows.map((r) => (
        <div key={r.user_id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.full_name || 'New person'}</p>
              {r.team_name && (
                <p className="text-xs text-muted-foreground">Pillar {r.team_name}</p>
              )}
              {r.manager_name && (
                <p className="text-xs text-muted-foreground">Manager {r.manager_name}</p>
              )}
              {r.invited_vertical && (
                <p className="text-xs text-muted-foreground">
                  Invited into {r.invited_vertical}
                </p>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(r.created_at), 'MMM d, yyyy')}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {INDUSTRIES.map((v) => (
              <Button
                key={v}
                variant={v === (r.invited_vertical || 'Pest') ? 'default' : 'outline'}
                className="min-h-11"
                disabled={busy === `${r.user_id}-${v}`}
                onClick={() => accept(r.user_id, v)}
              >
                Accept into {v}
              </Button>
            ))}
            <Button variant="ghost" className="min-h-11" onClick={() => setPlacing(r)}>
              Place under a manager
            </Button>
          </div>
        </div>
      ))}

      {placing && (
        <PlacePersonSheet
          userId={placing.user_id}
          fullName={placing.full_name || 'This person'}
          open
          onOpenChange={(o) => !o && setPlacing(null)}
          onPlaced={load}
        />
      )}
    </div>
  );
}

export default AwaitingIndustryPanel;
