import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useSaleStreak } from '@/hooks/useSaleStreak';
import { useHomeToday } from '@/hooks/useHomeToday';
import { useManagerWeek } from '@/hooks/useManagerWeek';
import { useActionCards } from '@/hooks/useActionCards';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { WinterPlanCard } from '@/components/workspace/WinterPlanCard';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { QuickChips, type QuickChip } from '@/components/home/QuickChips';
import { useSeasonMode, useResignHero, useRepOffSeasonLine } from '@/hooks/useSeasonMode';
import { WeekBars } from '@/components/home/WeekBars';
import { TeamTodayCard } from '@/components/home/TeamTodayCard';
import { HomeFeed } from '@/components/home/HomeFeed';
import { MoreReveal } from '@/components/home/MoreReveal';

import { YourThreeCard } from '@/components/home/YourThreeCard';
import { OwnerNumbersRow } from '@/components/home/OwnerNumbersRow';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

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

/** Whole dollars, no cents — these are season totals, not invoices. */
function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}


/**
 * Pass 95 — Air. Pest home shows five things and folds the rest behind More:
 * the greeting with today's number, Doors, needs you, the next event and chat.
 * Managers get their own five: team today, needs attention, one-on-ones,
 * invite and the next event.
 */
export function PestHome({ onOpenPoints }: { onOpenPoints?: () => void }) {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const staff = isManagerOrAbove(role);

  const { days: saleStreak } = useSaleStreak();
  const today = useHomeToday();
  const { totals } = useManagerWeek();
  const { cards } = useActionCards();
  const { offSeason } = useSeasonMode();
  const resign = useResignHero(offSeason && staff);
  const repLine = useRepOffSeasonLine(offSeason && !staff);


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
  const weekCount = today.weekBars.reduce((a, n) => a + n, 0);

  const moreChips: QuickChip[] = staff
    ? [
        { label: 'My week', to: '/app/team' },
        { label: 'Leads', to: '/app/leads' },
        { label: 'Incentives', to: '/app/leaderboard' },
        { label: 'Post', onClick: () => setPostOpen(true) },
        { label: 'Log a sale', onClick: () => setLogOpen(true) },
      ]
    : [
        { label: 'Field pack', to: '/app/training#field-pack' },
        { label: 'Ask Summit', to: '/app/ask' },
        { label: 'Missions', to: '/app/missions', badge: cards.length },
        { label: 'Board', to: '/app/leaderboard' },
      ];

  if (today.loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <Skeleton className="skeleton-shimmer h-24 w-full" />
        <Skeleton className="skeleton-shimmer h-14 w-full" />
        <Skeleton className="skeleton-shimmer h-28 w-full" />
      </div>
    );
  }

  const heroValue = offSeason ? today.trainingMinutes : staff ? today.visibleToday : today.today;
  const showHeroNumber = offSeason && staff ? resign.signed > 0 || resign.rosterTotal > 0 : heroValue > 0;

  const sublineParts = offSeason
    ? staff
      ? [
          resign.signedRevenue > 0 ? `${money(resign.signedRevenue)} signed` : null,
          resign.unsigned > 0
            ? `${resign.unsigned} on the roster not signed (${money(resign.unsignedRevenue)})`
            : null,
        ]
      : [
          repLine.goal > 0 ? `Goal ${money(repLine.goal)} for 2027` : null,
          repLine.streak > 0 ? `${repLine.streak} ${repLine.streak === 1 ? 'day' : 'days'} in a row` : null,
        ]
    : staff
      ? [totals.sales > 0 ? `${totals.sales} this week` : null]
      : [
          weekCount > 0 ? `${weekCount} this week` : null,
          saleStreak > 0 ? `${saleStreak} ${saleStreak === 1 ? 'day' : 'days'} with a sale` : null,
        ];
  const subline = sublineParts.filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:space-y-10">
      <OnboardingAlert />

      <UpdatesStrip isManagerTier={staff} />

      <header>
        <p className="text-[15px] text-muted-foreground">
          {greeting()}, {firstName}
        </p>
        {showHeroNumber && (
          <>
            <SectionEyebrow>
              {offSeason ? (staff ? 'Signed for 2027' : 'Training this week') : staff ? 'Team today' : 'Today'}
            </SectionEyebrow>
            {offSeason && staff ? (
              <button
                type="button"
                onClick={() => navigate('/app/leads')}
                className="mt-1 block text-left"
              >
                <span className="block text-[56px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                  {resign.signed}
                  {resign.rosterTotal > 0 && (
                    <span className="text-[24px] font-bold text-muted-foreground"> of {resign.rosterTotal}</span>
                  )}
                </span>
              </button>
            ) : (
              <p className="mt-1 text-[56px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {heroValue}
              </p>
            )}
            <span className="hero-accent-rule mt-3" aria-hidden />
          </>
        )}
        {subline && <p className="mt-2 text-[15px] text-muted-foreground">{subline}</p>}
      </header>

      <YourNumbers />

      {!staff && (
        <Button className="min-h-14 w-full text-[16px]" onClick={() => navigate('/app/doors')}>
          Doors
        </Button>
      )}

      {!staff && <NeedsYouRow className="!px-0" />}

      <HomeFeed />


      <MoreReveal>
        <QuickChips chips={moreChips} />

        <YourThreeCard />

        {staff && (
          <>
            <NeedsYouRow className="!px-0" />
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => navigate('/app/one-on-ones/prep')}
            >
              Prep this week's one-on-ones
            </Button>
            <InviteDialog />
          </>
        )}


        {!staff && (
          <Button className="min-h-11 w-full" onClick={() => setLogOpen(true)}>
            Log a sale
          </Button>
        )}

        <FiberStartCard />
        {!staff && <GoalInterviewCard />}
        <FirstWeekCard />

        <WeekBars
          bars={today.weekBars}
          trainingMinutes={today.trainingMinutes}
          onOpen={() => navigate(staff ? '/app/team' : '/app/leaderboard')}
        />


        <TeamTodayCard
          rows={today.topToday}
          limit={staff ? 5 : 3}
          myUserId={user?.id}
          title={staff ? 'Top today' : 'Team today'}
        />

        <WinterPlanCard />

        {onOpenPoints && (
          <Button variant="outline" className="min-h-11 w-full" onClick={onOpenPoints}>
            My points
          </Button>
        )}

        <InstallAppHint />

        {pinned && (
          <p className="text-[15px] text-muted-foreground">
            Pinned: <span className="text-foreground">{pinned}</span>
          </p>
        )}
      </MoreReveal>

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
