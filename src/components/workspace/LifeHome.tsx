import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';


import { Wordmark } from '@/components/brand/Wordmark';
import { LIFE_CARD, LIFE_STAGES } from '@/lib/lifePipeline';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';

interface Appt {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

/** Quiet chat entry point, shared by both states of this page. */
function ChatCard({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <div className={`${LIFE_CARD} space-y-3 p-4`}>
      <p className="text-sm font-medium text-foreground">Team chat</p>
      <Button variant="outline" size="sm" className="min-h-11" onClick={onOpen}>
        Open {label} chat
      </Button>
    </div>
  );
}

/**
 * Summit Life home. Appointments and pipeline, calm and clean.
 * No points, streaks, ranks, to do items, calculators, or installs.
 */
export function LifeHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const comingSoon = workspace.status === 'coming_soon' || workspace.membership_status !== 'active';
  const [loading, setLoading] = useState(!comingSoon);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [steps, setSteps] = useState({ done: 0, total: 0 });
  const [pinned, setPinned] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || comingSoon) return;
    const nowIso = new Date().toISOString();
    const [apptRes, pipeRes, stepsRes, doneRes, pinnedRes] = await Promise.all([
      (supabase as any)
        .from('calendar_events')
        .select('id, title, event_date, location')
        .eq('vertical', 'Life')
        .gte('event_date', nowIso)
        .order('event_date', { ascending: true })
        .limit(3),
      (supabase as any).from('life_pipeline').select('stage').eq('user_id', user.id),
      (supabase as any).from('vertical_steps').select('id').eq('vertical', 'Life').eq('is_active', true),
      (supabase as any)
        .from('vertical_step_completions')
        .select('step_id')
        .eq('user_id', user.id)
        .eq('vertical', 'Life'),
      (supabase as any)
        .from('announcement_posts')
        .select('title')
        .eq('is_pinned', true)
        .eq('status', 'published')
        .eq('vertical', 'Life')
        .limit(1),
    ]);

    setAppts((apptRes.data as Appt[]) || []);
    const tally: Record<string, number> = {};
    ((pipeRes.data as { stage: string }[]) || []).forEach((r) => {
      tally[r.stage] = (tally[r.stage] || 0) + 1;
    });
    setCounts(tally);
    setSteps({
      total: ((stepsRes.data as unknown[]) || []).length,
      done: ((doneRes.data as unknown[]) || []).length,
    });
    setPinned(((pinnedRes.data as { title: string }[]) || [])[0]?.title || null);
    setLoading(false);
  }, [user, comingSoon]);

  useEffect(() => {
    void load();
  }, [load]);


  if (comingSoon) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className={`${LIFE_CARD} p-6 text-center`}>
          <Wordmark variant="heroLife" className="mx-auto !h-auto w-full max-w-[260px]" />
          <h1 className="mt-5 font-display text-xl font-extrabold tracking-tight text-foreground">
            Life is being set up
          </h1>
          <span className="hero-accent-rule mx-auto mt-3" aria-hidden />
          <p className="mt-1.5 text-sm text-muted-foreground">
            You will hear from the owner when it opens.
          </p>

        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/app/pipeline')}
            className={`${LIFE_CARD} min-h-11 p-4 text-left`}
          >
            <p className="text-sm font-medium text-foreground">Pipeline</p>
            <p className="mt-1 text-sm text-muted-foreground">No clients yet.</p>
          </button>
          <button
            onClick={() => navigate('/app/training')}
            className={`${LIFE_CARD} min-h-11 p-4 text-left`}
          >
            <p className="text-sm font-medium text-foreground">Learn</p>
            <p className="mt-1 text-sm text-muted-foreground">Licensing material opens with the workspace.</p>
          </button>
          <button
            onClick={() => navigate('/app/events')}
            className={`${LIFE_CARD} min-h-11 p-4 text-left`}
          >
            <p className="text-sm font-medium text-foreground">Schedule</p>
            <p className="mt-1 text-sm text-muted-foreground">No appointments yet.</p>
          </button>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <WorkspaceHero
        firstName={(user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] || null}
        workspaceName={workspace.name}
        metric={{ label: 'In your pipeline', value: Object.values(counts).reduce((a, b) => a + b, 0) }}
      />
      <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
        Progress
      </Button>
    </div>
  );
}

export default LifeHome;
