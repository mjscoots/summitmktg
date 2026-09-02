import { ReactNode, Suspense, lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccessState } from '@/hooks/useAccessState';
// Pass 159 - the three gate screens render for a minority of sessions, so they
// load on demand instead of riding in the shell every route pays for.
const LockedOutScreen = lazy(() =>
  import('@/components/auth/LockedOutScreen').then((m) => ({ default: m.LockedOutScreen }))
);
const BootcampGate = lazy(() =>
  import('@/components/BootcampGate').then((m) => ({ default: m.BootcampGate }))
);
const AwaitingIndustryGate = lazy(() =>
  import('@/components/workspace/AwaitingIndustryGate').then((m) => ({ default: m.AwaitingIndustryGate }))
);

function GateFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'rookie' | 'manager' | 'admin' | 'owner';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, profile } = useAuth();
  const { state: access, loading: accessLoading } = useAccessState(isAuthenticated);
  const location = useLocation();

  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // NOTE: Approval check removed from here.
  // Users can access bootcamp without approval.
  // BootcampGate handles the approval gate AFTER bootcamp completion.

  // Alumni accounts keep limited read-only access to /app/alumni only
  if ((profile as any)?.alumni === true) {
    if (location.pathname !== '/app/alumni') {
      return <Navigate to="/app/alumni" replace />;
    }
    return <>{children}</>;
  }

  // Season reset: no role and not approved means one plain screen, no navigation, no data.
  if (!accessLoading && access && !access.has_role && !access.approved) {
    return (
      <Suspense fallback={<GateFallback />}>
        <LockedOutScreen
          archived={access.archived}
          defaultName={profile?.full_name || ''}
          requestStatus={access.request_status}
        />
      </Suspense>
    );
  }

  // Archived (non-alumni) accounts have no app access
  if ((profile as any)?.archived === true) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-foreground">This account is no longer active.</p>
        </div>
      </div>
    );
  }


  // Check if user is NLC (no access)
  if (profile?.status === 'nlc') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            Your account access has been revoked. Please contact your manager for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Owner has all permissions
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  // Presidents run their own industry workspace: they reach the admin surfaces,
  // which are themselves filtered to their workspace by query scope and RLS.
  const isPresident = role === 'president';
  const isManager = role === 'manager' || isPresident || isAdmin;

  // Check required role (managers can access rookie content, but not vice versa)
  if (requiredRole === 'manager' && !isManager) {
    return <Navigate to="/app" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin && !(isPresident && location.pathname.startsWith('/admin'))) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Suspense fallback={<GateFallback />}>
      <AwaitingIndustryGate>
        <BootcampGate>{children}</BootcampGate>
      </AwaitingIndustryGate>
    </Suspense>
  );

}
