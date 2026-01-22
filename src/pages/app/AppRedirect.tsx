import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * AppRedirect - Intelligent routing component
 * - Not logged in → /login
 * - Logged in → /app (unified dashboard)
 * This component should NEVER display content, only redirect.
 */
const AppRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated - redirect to unified dashboard
  // The dashboard itself handles role-based rendering
  return <Navigate to="/app" replace />;
};

export default AppRedirect;
