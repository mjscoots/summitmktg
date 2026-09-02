import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function WorkspaceApplicationsCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc('get_applications_awaiting_me' as never);
      if (!active) return;
      setCount(typeof data === 'number' ? data : 0);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (count === null) return null;

  return (
    <Link
      to="/admin/requests"
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <span className="text-sm text-muted-foreground">Workspace applications waiting on you</span>
      <span className="text-lg font-bold text-primary stat-num">{count}</span>
    </Link>
  );
}
