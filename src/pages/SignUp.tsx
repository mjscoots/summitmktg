import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SignUp = () => {
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [directManager, setDirectManager] = useState("");
  const [role, setRole] = useState<"rookie" | "manager" | "">("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all required fields
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !directManager.trim() || !role || !accessCode.trim()) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the edge function to validate access code and create account
      const { data, error: fnError } = await supabase.functions.invoke("validate-signup", {
        body: {
          accessCode: accessCode.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          directManager: directManager.trim(),
          role,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Signup failed");
      }

      if (data?.error) {
        setError(data.error);
        toast.error("Sign up failed", { description: data.error });
        setIsLoading(false);
        return;
      }

      if (data?.requiresLogin) {
        toast.success("Account created!", { description: "Please log in to continue." });
        navigate("/login", { replace: true });
        return;
      }

      // If we got a session back, set it
      if (data?.session) {
        await supabase.auth.setSession(data.session);
      }

      toast.success("Account created!", { description: "Welcome to Summit" });
      navigate("/app", { replace: true });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      toast.error("Sign up failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Join Summit</h1>
          <p className="text-muted-foreground text-sm">
            Create your account to start training
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Direct Manager *
            </label>
            <input
              type="text"
              value={directManager}
              onChange={(e) => setDirectManager(e.target.value)}
              placeholder="Manager's name"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Role *
            </label>
            <Select
              value={role}
              onValueChange={(value: "rookie" | "manager") => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rookie">Rookie</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Access Code *
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter your access code"
              className="input-field"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Contact your manager if you don't have an access code
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pr-12"
                required
                disabled={isLoading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
