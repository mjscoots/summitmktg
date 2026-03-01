import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, LogOut, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile, signOut, isLoading } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteMyAccount = async () => {
    if (!window.confirm("Delete your account permanently and sign up again?")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("self-delete-account");
      if (error) throw error;
      await signOut();
      toast.success("Account deleted. You can re-sign up now.");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Could not delete account right now.");
    } finally {
      setIsDeleting(false);
    }
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
        <button
          onClick={handleDeleteMyAccount}
          disabled={isDeleting}
          className="flex items-center gap-2 mx-auto mt-3 text-sm text-destructive hover:text-destructive/80 transition-colors disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting...' : 'Delete Account & Re-sign Up'}
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
