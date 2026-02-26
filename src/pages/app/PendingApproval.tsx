import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, LogOut } from "lucide-react";
import { useEffect } from "react";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile, signOut, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
    if (!isLoading && profile?.approved) {
      navigate("/app", { replace: true });
    }
  }, [isLoading, isAuthenticated, profile, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Awaiting Approval</h1>
        <p className="text-muted-foreground mb-2">
          Your account is awaiting admin approval to unlock full access.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          You'll receive an email once your manager approves you.
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
