import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { ProfileCompletionGate } from '@/components/ProfileCompletionGate';
import { Loader2 } from 'lucide-react';

interface BootcampGateProps {
  children: ReactNode;
}

/**
 * Wraps protected app routes to enforce bootcamp completion for rookies,
 * then profile completion for all users.
 * Managers/admins bypass bootcamp automatically but still need profile.
 */
export function BootcampGate({ children }: BootcampGateProps) {
  const { isLocked, isLoading } = useBootcamp();
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

  if (isLocked) {
    return <Navigate to="/bootcamp-lock" replace />;
  }

  // After bootcamp is complete, enforce profile completion
  return <ProfileCompletionGate>{children}</ProfileCompletionGate>;
}
