import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { StreakChip } from '@/components/shared/StreakChip';
import { useSaleStreak } from '@/hooks/useSaleStreak';
import { useHomeToday } from '@/hooks/useHomeToday';
import { useManagerWeek } from '@/hooks/useManagerWeek';
import { useChatChannels } from '@/hooks/useChatChannels';
import { useActionCards } from '@/hooks/useActionCards';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { WinterPlanCard } from '@/components/workspace/WinterPlanCard';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { HomeHero } from '@/components/home/HomeHero';
import { QuickChips, type QuickChip } from '@/components/home/QuickChips';
import { WeekBars } from '@/components/home/WeekBars';
import { TeamTodayCard } from '@/components/home/TeamTodayCard';
import { NextEventCard } from '@/components/home/NextEventCard';
import { InviteDialog } from '@/components/invites/InviteDialog';
import { AnnouncementEditorModal } from '@/components/dashboard/AnnouncementEditorModal';
import { LogSaleSheet } from '@/components/sales/LogSaleSheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FirstWeekCard } from '@/components/home/FirstWeekCard';
import { GoalInterviewCard } from '@/components/home/GoalInterviewCard';
import { FiberStartCard } from '@/components/workspace/FiberStartCard';
import { InstallAppHint } from '@/components/shared/InstallAppHint';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Pest home. One big number, the day's shape, and the next action under the
 * thumb. Managers see the same skeleton with their team's numbers.
 */
export function PestHome({ onOpenPoints }: { onOpenPoints?: () => void }) {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const staff = isManagerOrAbove(role);

  const { days: saleStreak } = useSaleStreak();
  const today = useHomeToday();
  const { totals } = useManagerWeek();
  const { totalUnread } = useChatChannels();
  const { cards } = useActionCards();

  const [logOpen, setLogOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);

  const loadPinned = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('announcement_posts')
      .select('title')
      .eq('is_pinned', true)
      .eq('status', 'published')
      .limit(1);
    setPinned(((data as { title: string }[]) || [])[0]?.title || null);
  }, []);

  useEffect(() => {
    void loadPinned();
  }, [loadPinned]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const weekCount = today.weekBars.reduce((a, n) => a + n, 0);

  const repChips: QuickChip[] = [
    { label: 'Field pack', to: '/app/training#field-pack' },
    { label: 'Ask Summit', to: '/app/ask' },
    { label: 'Chat', to: '/app/chat', badge: totalUnread },
    { label: 'Missions', to: '/app/missions', badge: cards.length },
  ];

  const managerChips: QuickChip[] = [
    { label: 'My week', to: '/app/week' },
    { label: 'Post', onClick: () => setPostOpen(true) },
    { label: 'Incentives', to: '/app/leaderboard' },
    { label: 'Log a sale', onClick: () => setLogOpen(true) },
    { label: 'Chat', to: '/app/chat', badge: totalUnread },
  ];

  if (today.loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-4">
        <Skeleton className="skeleton-shimmer h-6 w-48" />
        <Skeleton className="skeleton-shimmer h-40 w-full" />
        <Skeleton className="skeleton-shimmer h-11 w-full" />
        <Skeleton className="skeleton-shimmer h-28 w-full" />
      </div>
    );
  }

  const hero = staff ? (
    <HomeHero
      label="Team today"
      value={today.visibleToday}
      subline={`Team this week ${totals.sales} · ${totals.reps} ${totals.reps === 1 ? 'rep' : 'reps'}`}
      zeroLine="Nothing logged yet today"
      sparkline={today.sparkline}
      attention={{ count: totals.attention, onOpen: () => navigate('/app/week') }}
      shineKey="home-hero-manager"
    />
  ) : (
    <HomeHero
      label="Sales today"
      value={today.today}
      subline={`This week ${weekCount} · Team today ${today.visibleToday}`}
      zeroLine="Nothing logged yet today"
      weekCount={weekCount}
      showRing
      action={
        <Button className="min-h-11 w-full" onClick={() => setLogOpen(true)}>
          Log a sale
        </Button>
      }
      shineKey="home-hero-rep"
    />
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
      <OnboardingAlert />

      <header>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span>{dateLine}</span>
          <StreakChip days={saleStreak} label="days with a sale" />
        </p>
      </header>

      {/* Doors mode — the door is where the money is, so it sits above the fold */}
      <Button
        className="min-h-14 w-full text-[16px]"
        onClick={() => navigate('/app/doors')}
      >
        Doors
      </Button>

      <FiberStartCard />

      {!staff && <GoalInterviewCard />}

      <FirstWeekCard />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          {hero}
          <QuickChips chips={staff ? managerChips : repChips} />
          <WeekBars
            bars={today.weekBars}
            trainingMinutes={today.trainingMinutes}
            onOpen={() => navigate(staff ? '/app/week' : '/app/leaderboard')}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <TeamTodayCard
            rows={today.topToday}
            limit={staff ? 5 : 3}
            myUserId={user?.id}
            title={staff ? 'Top today' : 'Team today'}
          />
          <NeedsYouRow className="!px-0" />
          <NextEventCard />
          {staff && (
            <div className="card-ice p-3">
              <p className="micro-label mb-2">Bring someone in</p>
              <InviteDialog />
            </div>
          )}
        </div>
      </div>

      <WinterPlanCard />

      {onOpenPoints && (
        <Button variant="outline" className="min-h-11 w-full" onClick={onOpenPoints}>
          My points
        </Button>
      )}

      <InstallAppHint />

      {pinned && (
        <p className="text-[13px] text-muted-foreground">
          Pinned: <span className="text-foreground">{pinned}</span>
        </p>
      )}

      <LogSaleSheet open={logOpen} onOpenChange={setLogOpen} onSaved={() => void today.refresh()} />
      {postOpen && (
        <AnnouncementEditorModal
          open={postOpen}
          onOpenChange={setPostOpen}
          post={null}
          onSaved={() => {
            setPostOpen(false);
            void loadPinned();
          }}
        />
      )}
    </div>
  );
}

export default PestHome;
