import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';
import { Button } from '@/components/ui/button';

export function LifeHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [pipelineCount, setPipelineCount] = useState(0);

  useEffect(() => {
    if (!user?.id || workspace.status === 'coming_soon') return;
    void (async () => {
      const { count } = await (supabase as any)
        .from('life_pipeline')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setPipelineCount(count || 0);
    })();
  }, [user?.id, workspace.status]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName={workspace.name}
        metric={{ label: 'In your pipeline', value: pipelineCount }}
      />
      <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
        Progress
      </Button>
    </div>
  );
}

export default LifeHome;
