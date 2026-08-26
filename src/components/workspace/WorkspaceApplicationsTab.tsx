import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingList } from '@/components/shared/LoadingList';
import { toast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface Approver {
  user_id: string;
  name: string | null;
  decision: string | null;
  note: string | null;
}

interface Application {
  id: string;
  user_id: string;
  vertical: string;
  vertical_name: string;
  status: string;
  answers: Record<string, string> | null;
  created_at: string;
  applicant_name: string | null;
  applicant_rank: string | null;
  applicant_vertical: string | null;
  applicant_revenue_to_date: number | null;
  applicant_rep_year: number | null;
  approvers: Approver[];
  my_decision: string | null;
  i_am_approver: boolean;
}

const ANSWER_LABELS: Record<string, string> = {
  why: 'Why this industry',
  experience: 'Relevant experience',
  availability: 'Availability',
  markets: 'Markets',
  phone: 'Phone',
};

export function WorkspaceApplicationsTab() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_vertical_applications' as never, { _status: 'pending' } as never);
    setApps((data as unknown as Application[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id);
    const { data, error } = await supabase.rpc('decide_vertical_application' as never, {
      _application_id: id,
      _decision: decision,
      _note: notes[id] || null,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string; status?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not save decision', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: decision === 'approved' ? 'Approval recorded' : 'Application rejected' });
    load();
  };

  if (loading) return <LoadingList rows={3} />;

  if (apps.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No workspace applications waiting.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{a.applicant_name || 'Rep'}</p>
              <p className="text-xs text-muted-foreground">
                Applying to {a.vertical_name}
                {a.applicant_rank ? ` · ${a.applicant_rank}` : ''}
                {a.applicant_vertical ? ` · currently ${a.applicant_vertical}` : ''}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(a.created_at), 'MMM d, yyyy')}
            </span>
          </div>

          {(a.applicant_rep_year != null || a.applicant_revenue_to_date != null) && (
            <p className="mt-1 text-[11px] text-muted-foreground stat-num">
              {a.applicant_rep_year != null ? `Year ${a.applicant_rep_year}` : ''}
              {a.applicant_revenue_to_date != null
                ? `${a.applicant_rep_year != null ? ' · ' : ''}$${Number(a.applicant_revenue_to_date).toLocaleString()} to date`
                : ''}
            </p>
          )}

          <dl className="mt-3 space-y-1.5">
            {Object.entries(a.answers || {}).map(([k, v]) =>
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

          <div className="mt-3 space-y-1">
            {a.approvers.map((ap) => (
              <div key={ap.user_id} className="flex items-center gap-2 text-[12px]">
                {ap.decision === 'approved' ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : ap.decision === 'rejected' ? (
                  <X className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-border" />
                )}
                <span className="text-muted-foreground">{ap.name || 'Approver'}</span>
              </div>
            ))}
          </div>

          {a.i_am_approver && !a.my_decision && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Note (optional)"
                value={notes[a.id] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === a.id} onClick={() => decide(a.id, 'approved')}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === a.id}
                  onClick={() => decide(a.id, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {a.my_decision && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              You already {a.my_decision === 'approved' ? 'approved' : 'rejected'} this application.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
