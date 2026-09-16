import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, BriefcaseBusiness, Link2, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/commission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface IndustryApplication {
  id: string;
  vertical: string;
  status: string;
  created_at: string;
}

interface PersonalLink {
  id: string;
  title: string;
  url: string;
}

function statusVariant(status: string) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'destructive' as const;
  return 'warning' as const;
}

export function RepAccountProgress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<IndustryApplication[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [goalUpdatedAt, setGoalUpdatedAt] = useState<string | null>(null);
  const [links, setLinks] = useState<PersonalLink[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [applicationsResult, goalResult, linksResult] = await Promise.all([
      supabase
        .from('vertical_applications')
        .select('id, vertical, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('earnings_goals').select('goal, updated_at').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('managed_links')
        .select('id, title, url')
        .eq('link_scope', 'personal')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);
    setApplications((applicationsResult.data as IndustryApplication[]) ?? []);
    setGoal(goalResult.data?.goal == null ? null : Number(goalResult.data.goal));
    setGoalUpdatedAt(goalResult.data?.updated_at ?? null);
    setLinks((linksResult.data as PersonalLink[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <section className="space-y-4" aria-labelledby="account-progress-heading">
      <div>
        <h2 id="account-progress-heading" className="text-xl font-semibold text-foreground">My progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">Applications, goals, and the resources you are building.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <BriefcaseBusiness className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-foreground">Industry applications</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{applications.length}</p>
          {applications.length ? (
            <div className="mt-3 space-y-2">
              {applications.slice(0, 3).map((application) => (
                <div key={application.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{application.vertical} · {format(new Date(application.created_at), 'MMM d')}</span>
                  <Badge variant={statusVariant(application.status)}>{application.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No industry applications yet.</p>
          )}
          <Button asChild variant="link" className="mt-3 h-auto px-0">
            <Link to="/app/industries">View industries <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-foreground">Earnings goal</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{goal ? formatCurrency(goal) : 'Not set'}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {goalUpdatedAt ? `Updated ${format(new Date(goalUpdatedAt), 'MMM d, yyyy')}` : 'Set a target to keep your season visible.'}
          </p>
          <Button asChild variant="link" className="mt-3 h-auto px-0">
            <Link to="/app/estimate-earnings">{goal ? 'Update goal' : 'Set goal'} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-foreground">My Resource links</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{links.length}</p>
          {links.length ? (
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {links.slice(0, 3).map((link) => <li key={link.id} className="truncate">{link.title}</li>)}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Save the links you use most.</p>
          )}
          <Button asChild variant="link" className="mt-3 h-auto px-0">
            <Link to="/app/links">Manage links <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}