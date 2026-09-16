import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { BadgeShelf } from '@/components/badges/BadgeStrip';
import { TrophyCase } from '@/components/badges/TrophyCase';
import { TodoList } from '@/components/dashboard/TodoList';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useMyPoints } from '@/hooks/useMyPoints';
import { supabase } from '@/integrations/supabase/client';
import { CountUp } from '@/components/shared/CountUp';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { UserBadge } from '@/hooks/useBadges';
import { RepAccountProgress } from '@/components/progress/RepAccountProgress';

export default function ProgressPage() {
  const { user } = useAuth();
  const { data, isLoading } = useMyPoints();
  const [rank, setRank] = useState<number | null>(null);
  const [badge, setBadge] = useState<UserBadge | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data: rows } = await (supabase.rpc as any)('get_current_leaderboard');
      const mine = Array.isArray(rows) ? rows.find((row: any) => row.user_id === user.id) : null;
      setRank(mine?.rank ? Number(mine.rank) : null);
    })();
  }, [user?.id]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8 md:space-y-12 md:px-8 md:py-12">
        <PageHeader title="Progress" context="Your points, recognition and To do." />

        <RepAccountProgress />

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <section className="grid grid-cols-2 gap-8" aria-label="Progress figures">
            <div>
              <p className="text-[13px] text-muted-foreground">Streak</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground"><CountUp value={data?.currentStreak ?? 0} duration={700} /></p>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Points this week</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{data?.weeklyTotal.toLocaleString() ?? '0'}</p>
            </div>
          </section>
        )}

        <section>
          <p className="text-[13px] text-muted-foreground">Leaderboard rank</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{rank ? `#${rank}` : 'Not ranked'}</p>
        </section>

        {user?.id && (
          <section className="grid gap-8 md:grid-cols-2" aria-label="Recognition">
            <div>
              <h2 className="mb-3 text-[15px] font-semibold text-foreground">Badges</h2>
              <BadgeShelf userId={user.id} onSelect={setBadge} />
            </div>
            <TrophyCase userId={user.id} />
          </section>
        )}

        <section>
          <h2 className="mb-4 text-[20px] font-semibold text-foreground">To do</h2>
          <TodoList />
        </section>

        <Sheet open={Boolean(badge)} onOpenChange={(open) => !open && setBadge(null)}>
          <SheetContent side="bottom" className="pb-8">
            <SheetHeader>
              <SheetTitle>{badge?.name}</SheetTitle>
            </SheetHeader>
            <p className="mt-3 text-[15px] text-muted-foreground">
              {badge?.description || 'No description saved for this one yet.'}
            </p>
          </SheetContent>
        </Sheet>
      </main>
    </AppLayout>
  );
}