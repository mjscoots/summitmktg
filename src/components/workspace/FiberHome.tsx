import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';
import { HomeNumber } from '@/components/home/HomeNumber';
import { NextActionRow } from '@/components/home/NextActionRow';
import { ManagerTodayCard } from '@/components/home/ManagerTodayCard';
import { Resign2027Card } from '@/components/home/Resign2027Card';
import { MoreOnYourWeek } from '@/components/home/MoreOnYourWeek';
import { Button } from '@/components/ui/button';

export function FiberHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const staff = isManagerOrAbove(role);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8 pt-6 sm:space-y-8">
      {staff && (
        <>
          <ManagerTodayCard />
          <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/team')}>
            Team
          </Button>
        </>
      )}

      <HomeNumber vertical="Fiber" />
      <NextActionRow />

      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName={workspace.name}
      />

      <Resign2027Card />

      <MoreOnYourWeek>
        <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
          Progress
        </Button>
      </MoreOnYourWeek>
    </div>
  );
}

export default FiberHome;
