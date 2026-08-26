import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeQuickCards } from '@/components/dashboard/HomeQuickCards';

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

interface Money {
  rank_label?: string | null;
  next_tier_label?: string | null;
  next_tier_gap?: number | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** Home screen for a non-pest workspace. Pest keeps the existing home. */
export function WorkspaceHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPresidentOfActive } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [weekInstalls, setWeekInstalls] = useState(0);
  const [seasonInstalls, setSeasonInstalls] = useState(0);
  const [money, setMoney] = useState<Money | null>(null);
  const [steps, setSteps] = useState({ done: 0, total: 0 });
  const [pinned, setPinned] = useState<{ id: string; title: string } | null>(null);
  const [nextEvent, setNextEvent] = useState<{ title: string; event_date: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const week = startOfWeek();
    const [installsRes, moneyRes, stepsRes, doneRes, pinnedRes, eventsRes] = await Promise.all([
      (supabase as any).from('fiber_installs').select('installs, week_start').eq('user_id', user.id),
      (supabase as any).rpc('get_my_money'),
      (supabase as any).from('vertical_steps').select('id').eq('vertical', workspace.vertical).eq('is_active', true),
      (supabase as any).from('vertical_step_completions').select('step_id').eq('user_id', user.id).eq('vertical', workspace.vertical),
      (supabase as any)
        .from('announcement_posts')
        .select('id, title')
        .eq('is_pinned', true)
        .eq('status', 'published')
        .eq('vertical', workspace.vertical)
        .limit(1),
      (supabase as any).rpc('get_events_feed', {}),
    ]);

    const rows = (installsRes.data as { installs: number; week_start: string }[]) || [];
    setWeekInstalls(rows.filter((r) => r.week_start === week).reduce((a, r) => a + (r.installs || 0), 0));
    setSeasonInstalls(rows.reduce((a, r) => a + (r.installs || 0), 0));
    setMoney((moneyRes.data as Money) || null);
    setSteps({
      total: ((stepsRes.data as unknown[]) || []).length,
      done: ((doneRes.data as unknown[]) || []).length,
    });
    setPinned(((pinnedRes.data as { id: string; title: string }[]) || [])[0] || null);
    const feed = ((eventsRes.data as { title: string; event_date: string }[]) || []).filter(
      (e) => new Date(e.event_date) >= new Date()
    );
    setNextEvent(feed[0] || null);
    setLoading(false);
  }, [user, workspace.vertical]);

  useEffect(() => {
    load();
  }, [load]);

  if (workspace.status === 'coming_soon') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <Card className="p-5 space-y-2">
          <p className="text-sm">Opening soon.</p>
          <p className="text-sm text-muted-foreground">
            Your application status: {workspace.membership_status || 'not applied'}.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/industries')}>
            View industries
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.unit} this week and season, your rank, and what is next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="This week" value={String(weekInstalls)} />
        <Stat label="Season" value={String(seasonInstalls)} />
        <Stat label="Rank" value={money?.rank_label || '—'} />
        <Stat label="Next tier" value={money?.next_tier_label || '—'} />
      </div>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Setup path</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {steps.done} of {steps.total} steps complete
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/industries')}>
          Continue setup
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Announcement</p>
        <p className="text-sm text-muted-foreground">{pinned ? pinned.title : 'No announcement yet.'}</p>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Next event</p>
        <p className="text-sm text-muted-foreground">
          {nextEvent
            ? `${nextEvent.title} · ${new Date(nextEvent.event_date).toLocaleString()}`
            : 'No events scheduled.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/events')}>
          Open events
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Chat</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/chat')}>
          Open {workspace.short_name} chat
        </Button>
      </Card>

      {isPresidentOfActive && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-medium">First-run checklist</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Write your intro announcement</li>
            <li>Add your first training course</li>
            <li>Add your scripts</li>
            <li>Set your capacity</li>
            <li>Invite your reps with your referral link</li>
            <li>Enter this week&apos;s {workspace.unit}</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/admin')}>
              Open admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/recruits')}>
              Referral link
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
