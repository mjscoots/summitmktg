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
import { WeekBars } from '@/components/home/WeekBars';
import { TeamTodayCard } from '@/components/home/TeamTodayCard';
import { NextEventCard } from '@/components/home/NextEventCard';
import { ChatPreviewCard } from '@/components/home/ChatPreviewCard';
import { MoreReveal } from '@/components/home/MoreReveal';
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
        { label: 'My week', to: '/app/week' },
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

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:space-y-10">
      <OnboardingAlert />

      {/* One display size per screen: this number is it. */}
      <header>
        <SectionEyebrow>
          {offSeason ? (staff ? 'Signed for 2027' : 'Training this week') : staff ? 'Team today' : 'Today'}
        </SectionEyebrow>
        <p className="text-[15px] text-muted-foreground">
          {greeting()}, {firstName}
        </p>
        {offSeason && staff ? (
          <button
            type="button"
            onClick={() => navigate('/app/leads')}
            className="mt-2 block text-left"
          >
            <span className="block text-[56px] font-bold leading-none tracking-tight text-foreground tabular-nums">
              {resign.signed}
            </span>
          </button>
        ) : (
          <p className="mt-2 text-[56px] font-bold leading-none tracking-tight text-foreground tabular-nums">
            {offSeason ? today.trainingMinutes : staff ? today.visibleToday : today.today}
          </p>
        )}
        <p className="mt-2 text-[15px] text-muted-foreground">
          {offSeason
            ? staff
              ? `${money(resign.signedRevenue)} signed · ${resign.unsigned} not signed (${money(resign.unsignedRevenue)})`
              : [
                  repLine.goal > 0 ? `Goal ${money(repLine.goal)} for 2027` : 'Minutes this week',
                  `${repLine.streak} ${repLine.streak === 1 ? 'day' : 'days'} in a row`,
                ].join(' · ')
            : staff
              ? `${totals.sales} this week across ${totals.reps} ${totals.reps === 1 ? 'rep' : 'reps'}`
              : `${weekCount} this week · ${saleStreak} ${saleStreak === 1 ? 'day' : 'days'} with a sale`}
        </p>
      </header>


      {staff ? (
        <>
          <section>
            <SectionEyebrow>Needs attention</SectionEyebrow>
            <button
              type="button"
              onClick={() => navigate('/app/week')}
              className="card-ice flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left"
            >
              <span className="text-[15px] text-foreground">
                {totals.attention > 0 ? 'Open my week' : 'Everyone is moving'}
              </span>
              <span className="text-[20px] font-bold tabular-nums text-foreground">
                {totals.attention}
              </span>
            </button>
          </section>

          <section>
            <SectionEyebrow>One-on-ones</SectionEyebrow>
            <button
              type="button"
              onClick={() => navigate('/app/one-on-ones/prep')}
              className="card-ice flex min-h-14 w-full items-center px-4 text-left text-[15px] text-foreground"
            >
              Prep this week's one-on-ones
            </button>
          </section>

          <section>
            <SectionEyebrow>Bring someone in</SectionEyebrow>
            <InviteDialog />
          </section>
        </>
      ) : (
        <Button className="min-h-14 w-full text-[16px]" onClick={() => navigate('/app/doors')}>
          Doors
        </Button>
      )}

      {!staff && <NeedsYouRow className="!px-0" />}

      <NextEventCard />

      {!staff && <ChatPreviewCard />}

      <MoreReveal>
        <QuickChips chips={moreChips} />

        {staff && (
          <>
            <NeedsYouRow className="!px-0" />
            <ChatPreviewCard />
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
          onOpen={() => navigate(staff ? '/app/week' : '/app/leaderboard')}
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
