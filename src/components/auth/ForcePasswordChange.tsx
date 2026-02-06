import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ForcePasswordChangeProps {
  onComplete: () => void;
  userEmail: string;
}

const ForcePasswordChange = ({ onComplete, userEmail }: ForcePasswordChangeProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValid) {
      setError("Please meet all password requirements");
      return;
    }

    setIsLoading(true);

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Mark password as changed in profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ password_changed: true })
          .eq("user_id", user.id);

        if (profileError) {
          console.error("Failed to update profile:", profileError);
          // Don't fail the operation, password was still changed
        }
      }

      toast.success("Password updated successfully!");
      onComplete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update password";
      setError(errorMessage);
      toast.error("Password update failed", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRequirement = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
      {met ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-current" />
      )}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Create New Password</h1>
          <p className="text-muted-foreground text-sm">
            Welcome to Summit! Please create a secure password for your account.
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            {userEmail}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="input-field pr-12"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input-field pr-12"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
            <p className="text-sm font-medium text-foreground mb-2">Password Requirements</p>
            <PasswordRequirement met={hasMinLength} label="At least 8 characters" />
            <PasswordRequirement met={hasUppercase} label="One uppercase letter" />
            <PasswordRequirement met={hasLowercase} label="One lowercase letter" />
            <PasswordRequirement met={hasNumber} label="One number" />
            <PasswordRequirement met={passwordsMatch} label="Passwords match" />
          </div>

          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Set New Password"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This is a one-time setup. You won't need to do this again.
        </p>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
