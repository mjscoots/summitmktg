import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/** Routes that belong to one industry. Everything else is shared. */
const OWNED: { prefix: string; vertical: string }[] = [
  { prefix: '/app/installs', vertical: 'Fiber' },
  { prefix: '/app/stacks', vertical: 'Fiber' },
  { prefix: '/app/pipeline', vertical: 'Life' },
  { prefix: '/app/doors', vertical: 'Pest' },
  { prefix: '/app/season', vertical: 'Pest' },
  { prefix: '/app/estimate-earnings', vertical: 'Pest' },
];

/**
 * Pass 144 — the workspace is the wall. A screen that belongs to one industry
 * only opens while that industry is the active workspace, for everyone,
 * including staff. A direct link from the wrong workspace lands back on Home
 * with one quiet line naming where the screen lives.
 */
export function VerticalRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { activeVertical, isLoading } = useWorkspace();
  const told = useRef<string | null>(null);

  const owned = OWNED.find((o) => pathname.startsWith(o.prefix));
  const wrong = Boolean(owned) && !isLoading && owned!.vertical !== activeVertical;

  useEffect(() => {
    if (!wrong || !owned) return;
    if (told.current === pathname) return;
    told.current = pathname;
    toast(`That lives in ${owned.vertical}. Switch workspace to open it.`);
  }, [wrong, owned, pathname]);

  if (wrong) return <Navigate to="/app" replace />;

  return <>{children}</>;
}

export default VerticalRouteGuard;
