import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyPoints } from '@/hooks/useMyPoints';
import { useStreak } from '@/hooks/useStreak';
import { useHomeSnapshot } from '@/hooks/useHomeSnapshot';
import { useChatChannels } from '@/hooks/useChatChannels';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { WinterPlanCard } from '@/components/workspace/WinterPlanCard';
import { HomeQuestionCard } from '@/components/home/HomeQuestionCard';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CARD = 'rounded-[10px] border border-border bg-card p-3';

interface Mission {
  id: string;
  title: string;
  is_completed: boolean;
}

interface LbRow {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  rank: number;
  total_points: number;
}

/** Uppercase label used only by the numbers strip. */
function NumberCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-label">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-accent-number">{value}</p>
    </div>
  );
}

/**
 * Pest home: a greeting, the numbers that matter today, what needs the rep,
 * today's missions, where the rep stands, and the last lines of team chat.
 */
export function PestHome({ onOpenPoints }: { onOpenPoints?: () => void }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: points } = useMyPoints();
  const { streakData } = useStreak();
  const { data: snapshot } = useHomeSnapshot();
  const { channels, totalUnread } = useChatChannels();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [board, setBoard] = useState<LbRow[]>([]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [todoRes, lbRes, pinnedRes] = await Promise.all([
      supabase
        .from('todo_items')
        .select('id, title, is_completed')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('display_order')
        .limit(3),
      (supabase.rpc as any)('get_current_leaderboard'),
      (supabase as any)
        .from('announcement_posts')
        .select('title')
        .eq('is_pinned', true)
        .eq('status', 'published')
        .limit(1),
    ]);
    setMissions((todoRes.data as Mission[]) || []);
    setBoard(((lbRes.data as LbRow[]) || []).slice()); 
    setPinned(((pinnedRes.data as { title: string }[]) || [])[0]?.title || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(m: Mission) {
    setMissions((prev) => prev.filter((x) => x.id !== m.id));
    await supabase
      .from('todo_items')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', m.id);
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const pointsToday = points
    ? points.capsToday.hours.earned +
      points.capsToday.chat.earned +
      points.capsToday.lesson.earned +
      points.capsToday.video.earned +
      points.capsToday.manual.earned
    : 0;

  const myRow = board.find((r) => r.user_id === user?.id) || null;
  const topThree = board.filter((r) => Number(r.rank) <= 3).sort((a, b) => a.rank - b.rank);
  const chatLines = channels.filter((c) => c.last_content).slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <OnboardingAlert />

      <header>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>{today}</span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-accent-number" />
            <span className="tabular-nums">{streakData.currentStreak}d streak</span>
          </span>
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <NumberCell label="Points today" value={String(pointsToday)} />
        <NumberCell label="Rank" value={myRow ? `#${myRow.rank}` : '—'} />
        <NumberCell label="This week" value={String(snapshot?.week_points ?? 0)} />
      </div>

      <NeedsYouRow className="!px-0" />

      <WinterPlanCard />
      <HomeQuestionCard />

      <section className={cn(CARD, 'space-y-3')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Today</h2>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => navigate('/app/missions')}>
            See all
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : missions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No open missions.</p>
        ) : (
          <ul className="space-y-2">
            {missions.map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                <Checkbox
                  id={`mission-${m.id}`}
                  className="mt-0.5"
                  checked={false}
                  onCheckedChange={() => void complete(m)}
                />
                <label htmlFor={`mission-${m.id}`} className="text-[13px] text-foreground">
                  {m.title}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cn(CARD, 'space-y-3')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Leaderboard</h2>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => navigate('/app/leaderboard')}>
            Open
          </Button>
        </div>
        {topThree.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No standings yet.</p>
        ) : (
          <ul className="space-y-2">
            {topThree.map((r) => (
              <li key={r.user_id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-foreground">
                  {r.rank}. {r.nickname || r.full_name || 'Rep'}
                </span>
                <span className="text-[13px] tabular-nums text-accent-number">{r.total_points}</span>
              </li>
            ))}
            {myRow && myRow.rank > 3 && (
              <li className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                  {myRow.rank}. You
                </span>
                <span className="text-[13px] tabular-nums text-accent-number">{myRow.total_points}</span>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className={cn(CARD, 'space-y-3')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Team chat</h2>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <span className="text-[11px] font-semibold tabular-nums text-accent-number">
                {totalUnread > 99 ? '99+' : totalUnread} unread
              </span>
            )}
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => navigate('/app/chat')}>
              Open
            </Button>
          </div>
        </div>
        {chatLines.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {chatLines.map((c) => (
              <li key={c.slug} className="truncate text-[13px] text-muted-foreground">
                <span className="text-foreground">{c.last_sender || c.label}: </span>
                {c.last_content}
              </li>
            ))}
          </ul>
        )}
      </section>

      {onOpenPoints && (
        <Button variant="outline" className="min-h-11 w-full" onClick={onOpenPoints}>
          My points
        </Button>
      )}

      {pinned && (
        <p className="text-[13px] text-muted-foreground">
          Pinned: <span className="text-foreground">{pinned}</span>
        </p>
      )}
    </div>
  );
}

export default PestHome;
