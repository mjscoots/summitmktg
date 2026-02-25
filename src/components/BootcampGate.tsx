import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { ProfileCompletionGate } from '@/components/ProfileCompletionGate';
import { Loader2 } from 'lucide-react';

interface BootcampGateProps {
  children: ReactNode;
}

/**
 * Wraps protected app routes to enforce:
 * 1. Bootcamp completion for rookies
 * 2. Admin approval AFTER bootcamp completion
 * 3. Profile completion for all users
 * Managers/admins bypass bootcamp and approval automatically.
 */
export function BootcampGate({ children }: BootcampGateProps) {
  const { isLocked, isLoading, isBypassed } = useBootcamp();
  const { profile } = useAuth();
  const location = useLocation();

  // Don't gate bootcamp routes themselves
  if (location.pathname.startsWith('/bootcamp')) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: Must complete bootcamp first
  if (isLocked) {
    return <Navigate to="/bootcamp-lock" replace />;
  }

  // Step 2: After bootcamp, require admin approval (managers/admins bypass)
  if (!isBypassed && profile && profile.approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Step 3: After approval, enforce profile completion
  return <ProfileCompletionGate>{children}</ProfileCompletionGate>;
}
