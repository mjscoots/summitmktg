import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFiberToday } from '@/hooks/useFiberToday';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';
import { Button } from '@/components/ui/button';

export function FiberHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { today } = useFiberToday();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-8 pt-6 sm:space-y-10">
      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName={workspace.name}
        metric={{ label: 'Today', value: today }}
      />
      <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
        Progress
      </Button>
    </div>
  );
}

export default FiberHome;
