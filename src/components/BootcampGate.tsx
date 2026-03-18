import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { ProfileCompletionGate } from '@/components/ProfileCompletionGate';
import { Loader2 } from 'lucide-react';

interface BootcampGateProps {
  children: ReactNode;
}

/**
 * Wraps protected app routes to enforce:
 * 1. Rejected users get signed out immediately
 * 2. Summer Checklist completion for rookies
 * 3. Admin approval AFTER checklist completion
 * 4. Profile completion for all users
 * Managers/admins bypass checklist and approval automatically.
 */
export function BootcampGate({ children }: BootcampGateProps) {
  const { isLocked, isLoading, isBypassed } = useBootcamp();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Step 0: If user was rejected, sign them out and redirect to homepage
  useEffect(() => {
    if (!isLoading && profile?.status === 'rejected') {
      signOut().then(() => {
        navigate('/login?reason=declined', { replace: true });
      });
    }
  }, [isLoading, profile?.status, signOut, navigate]);

  // Don't gate Summer Checklist routes themselves
  if (location.pathname.startsWith('/bootcamp') || location.pathname.startsWith('/summer-checklist')) {
    return <>{children}</>;
  }

  if (isLoading || profile?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: Must complete checklist first
  if (isLocked) {
    return <Navigate to="/summer-checklist" replace />;
  }

  // Step 2: After checklist, require admin approval (managers/admins bypass)
  if (!isBypassed && profile && profile.approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Step 3: After approval, enforce profile completion
  return <ProfileCompletionGate>{children}</ProfileCompletionGate>;
}
