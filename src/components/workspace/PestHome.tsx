import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useSaleStreak } from '@/hooks/useSaleStreak';
import { useHomeToday } from '@/hooks/useHomeToday';
import { useSeasonMode, useResignHero } from '@/hooks/useSeasonMode';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function PestHome() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const staff = isManagerOrAbove(role);
  const { days: saleStreak } = useSaleStreak();
  const today = useHomeToday();
  const { offSeason } = useSeasonMode();
  const resign = useResignHero(offSeason && staff);

  if (today.loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const value = offSeason ? (staff ? resign.signed : today.trainingMinutes) : staff ? today.visibleToday : today.today;
  const label = offSeason ? (staff ? 'Signed for 2027' : 'Training this week') : staff ? 'Team today' : 'Today';

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:space-y-10">
      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName="Pest"
        streak={saleStreak}
        metric={{ label, value }}
      />
      <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
        Progress
      </Button>
    </div>
  );
}

export default PestHome;
