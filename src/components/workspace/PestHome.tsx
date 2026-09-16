import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useSaleStreak } from '@/hooks/useSaleStreak';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';
import { HomeNumber } from '@/components/home/HomeNumber';
import { NextActionRow } from '@/components/home/NextActionRow';
import { ManagerTodayCard } from '@/components/home/ManagerTodayCard';
import { Resign2027Card } from '@/components/home/Resign2027Card';
import { MoreOnYourWeek } from '@/components/home/MoreOnYourWeek';
import { Button } from '@/components/ui/button';

export function PestHome() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const staff = isManagerOrAbove(role);
  const { days: saleStreak } = useSaleStreak();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:space-y-8">
      {staff && (
        <>
          <ManagerTodayCard />
          <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/team')}>
            Team
          </Button>
        </>
      )}

      <HomeNumber vertical="Pest" />
      <NextActionRow />

      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName="Pest"
        streak={saleStreak}
      />

      <Resign2027Card />

      <MoreOnYourWeek>
        <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
          Progress
        </Button>
        <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/missions')}>
          To do
        </Button>
        <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/season')}>
          Season
        </Button>
      </MoreOnYourWeek>
    </div>
  );
}

export default PestHome;
