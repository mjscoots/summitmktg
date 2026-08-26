import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RepScorecard } from '@/components/shared/RepScorecard';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ChevronDown, ClipboardList } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface AppRow {
  id: string;
  user_id: string;
  vertical: string;
  why: string;
  prior_results: string | null;
  availability: string | null;
  status: string;
  created_at: string;
  full_name: string | null;
  rep_year: string | null;
  office_name: string | null;
  current_vertical: string | null;
  seasons_completed: number;
  leads_worked: number;
}

/** Owner-only queue for "Run a team" applications. */
export function TeamLeadApplicationsPanel() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_team_lead_applications' as never, { _status: 'pending' } as never);
    setRows(((data as unknown as { rows: AppRow[] })?.rows) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.rpc('review_team_lead_application' as never, {
      _id: id,
      _approve: approve,
      _note: note.trim() || null,
    } as never);
    setBusy(null);
    const out = data as unknown as { success: boolean; error?: string } | null;
    if (error || !out?.success) {
      toast({ title: 'Could not save', description: out?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: approve ? 'Approved' : 'Denied' });
    setNote('');
    setOpenId(null);
    load();
  };

  if (rows.length === 0) return null;

  return (
    <section className={CARD}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <ClipboardList className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Run a team requests</h2>
          <p className="text-[12px] text-muted-foreground tabular-nums">{rows.length} waiting</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          const expanded = openId === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border/50 bg-surface">
              <button
                type="button"
                onClick={() => { setOpenId(expanded ? null : r.id); setNote(''); }}
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{r.full_name || 'Rep'}</p>
                  <p className="truncate text-[12px] text-muted-foreground tabular-nums">
                    {r.vertical} · Year {r.rep_year || '1'} · {r.seasons_completed} season
                    {r.seasons_completed === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              </button>

              {expanded && (
                <div className="space-y-3 border-t border-border/50 p-3">
                  <div>
                    <p className="micro-label">Why</p>
                    <p className="whitespace-pre-wrap text-[13px] text-foreground">{r.why}</p>
                  </div>
                  {r.prior_results && (
                    <div>
                      <p className="micro-label">Prior results</p>
                      <p className="whitespace-pre-wrap text-[13px] text-foreground">{r.prior_results}</p>
                    </div>
                  )}
                  {r.availability && (
                    <div>
                      <p className="micro-label">Availability</p>
                      <p className="text-[13px] text-foreground">{r.availability}</p>
                    </div>
                  )}
                  <RepScorecard userId={r.user_id} compact />
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    placeholder="Optional note to the applicant"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)}>Approve</Button>
                    <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => review(r.id, false)}>
                      Deny
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default TeamLeadApplicationsPanel;
