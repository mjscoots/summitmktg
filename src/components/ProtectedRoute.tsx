import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'rookie' | 'manager' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, profile } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is pending approval
  if (profile && profile.approved === false) {
    return <Navigate to="/pending-approval" replace />;
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

  // Check required role (managers can access rookie content, but not vice versa)
  if (requiredRole === 'manager' && role === 'rookie') {
    return <Navigate to="/app" replace />;
  }

  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
