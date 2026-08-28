import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { tierOf, isStaffTier } from '@/lib/tiers';

/** Routes that belong to one industry. Everything else is shared. */
const OWNED: { prefix: string; vertical: string }[] = [
  { prefix: '/app/installs', vertical: 'Fiber' },
  { prefix: '/app/pipeline', vertical: 'Life' },
  { prefix: '/app/playbook', vertical: 'Pest' },
  { prefix: '/app/doors', vertical: 'Pest' },
  { prefix: '/app/season', vertical: 'Pest' },
];

/**
 * Pass 86 — a rep cannot browse an industry they are not part of. A direct URL
 * to another industry's screen bounces back to their own home. The data behind
 * those screens is scoped server-side by RLS; this only keeps the app honest.
 */
export function VerticalRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const { myWorkspaces, isLoading } = useWorkspace();

  const owned = OWNED.find((o) => pathname.startsWith(o.prefix));
  if (!owned || isLoading || isStaffTier(tierOf(role))) return <>{children}</>;

  const enrolled = myWorkspaces.some((w) => w.vertical === owned.vertical);
  if (!enrolled && myWorkspaces.length > 0) return <Navigate to="/app" replace />;

  return <>{children}</>;
}

export default VerticalRouteGuard;
