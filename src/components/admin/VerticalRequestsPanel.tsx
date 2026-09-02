import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingList } from '@/components/shared/LoadingList';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface VerticalRequest {
  id: string;
  user_id: string;
  vertical: string;
  vertical_name: string;
  status: string;
  answers: Record<string, string> | null;
  created_at: string;
  rep_name: string | null;
  team_name: string | null;
  manager_name: string | null;
  rep_year: number | null;
  revenue_to_date: number | null;
}

const ANSWER_LABELS: Record<string, string> = {
  why: 'Why they want in',
  experience: 'Experience or results',
  availability: 'Availability',
};

/**
 * Pass 89 - the owner's gate for Fiber and Life. Pest needs no request, so only
 * the locked industries land here.
 */
export function VerticalRequestsPanel() {
  const [rows, setRows] = useState<VerticalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_vertical_requests' as never, { _status: 'pending' } as never);
    setRows((data as unknown as VerticalRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id);
    const { data, error } = await supabase.rpc('decide_vertical_request' as never, {
      _application_id: id,
      _decision: decision,
      _note: notes[id]?.trim() || null,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not save that decision',
        description: res?.error || error?.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: decision === 'approved' ? 'Access approved' : 'Request declined' });
    void load();
  };

  if (loading) return <LoadingList rows={3} />;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No vertical requests waiting.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.rep_name || 'Rep'}</p>
              <p className="text-xs text-muted-foreground">
                Asking for {r.vertical_name}
                {r.team_name ? ` · ${r.team_name}` : ''}
                {r.manager_name ? ` · manager ${r.manager_name}` : ''}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(r.created_at), 'MMM d, yyyy')}
            </span>
          </div>

          {(r.rep_year != null || r.revenue_to_date != null) && (
            <p className="mt-1 text-[11px] text-muted-foreground stat-num">
              {r.rep_year != null ? `Year ${r.rep_year}` : ''}
              {r.revenue_to_date != null
                ? `${r.rep_year != null ? ' · ' : ''}$${Number(r.revenue_to_date).toLocaleString()} season revenue`
                : ''}
            </p>
          )}

          <dl className="mt-3 space-y-1.5">
            {Object.entries(r.answers || {}).map(([k, v]) =>
              v ? (
                <div key={k} className="text-[13px]">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {ANSWER_LABELS[k] || k}
                  </dt>
                  <dd className="text-foreground/90">{v}</dd>
                </div>
              ) : null
            )}
          </dl>

          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Note (optional)"
              value={notes[r.id] || ''}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11" disabled={busy === r.id} onClick={() => decide(r.id, 'approved')}>
                Approve
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy === r.id}
                onClick={() => decide(r.id, 'rejected')}
              >
                Deny
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default VerticalRequestsPanel;
