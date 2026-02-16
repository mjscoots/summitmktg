import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, profile } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Sign Up state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLevel, setSignupLevel] = useState<'rookie' | 'manager'>('rookie');
  const [signupTeam, setSignupTeam] = useState("");
  const [signupReferredBy, setSignupReferredBy] = useState("");
  const [signupReferredByOther, setSignupReferredByOther] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Dropdown data
  const [approvedUsers, setApprovedUsers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      if (!profile.approved) {
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [isAuthenticated, profile, navigate]);

  // Fetch data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, teamsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("approved", true)
          .order("full_name"),
        supabase
          .from("teams")
          .select("id, name")
          .order("name"),
      ]);

      setApprovedUsers(profilesRes.data || []);
      setTeams(teamsRes.data || []);
    };
    fetchData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast.error("Login failed", { description: error.message });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!signupName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword.trim()) {
      setError("All fields are required.");
      return;
    }

    if (!signupTeam) {
      setError("Please select a team.");
      return;
    }

    const referredBy = signupReferredBy === "__other__" 
      ? signupReferredByOther 
      : approvedUsers.find(u => u.user_id === signupReferredBy)?.full_name || "";

    if (!referredBy.trim()) {
      setError("Please specify who referred you.");
      return;
    }

    setIsLoading(true);

    const selectedTeam = teams.find(t => t.id === signupTeam);

    const { error } = await signUp(signupEmail.trim(), signupPassword, signupName.trim(), {
      phone: signupPhone.trim(),
      team_id: signupTeam,
      team_name: selectedTeam?.name || "",
      referred_by: referredBy,
      selected_role: signupLevel,
    });

    if (error) {
      setError(error.message);
      toast.error("Sign up failed", { description: error.message });
      setIsLoading(false);
      return;
    }

    toast.success("Account created! Awaiting admin approval.");
    navigate("/pending-approval", { replace: true });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Summit</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account or create a new one
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border border-border/30 rounded-lg overflow-hidden">
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" required disabled={isLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pr-12" required disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
              {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>) : "Sign In"}
            </button>
          </form>
        )}

        {/* SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
              New accounts require admin approval before access is granted.
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
              <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="John Doe" className="input-field" required disabled={isLoading} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
              <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" className="input-field" required disabled={isLoading} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
              <input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="(555) 123-4567" className="input-field" required disabled={isLoading} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
              <div className="relative">
                <input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••" className="input-field pr-12" required minLength={6} disabled={isLoading} />
                <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Level of Experience *</label>
              <select value={signupLevel} onChange={(e) => setSignupLevel(e.target.value as 'rookie' | 'manager')} className="input-field" disabled={isLoading}>
                <option value="rookie">Rookie</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Whose team are you a part of? *</label>
              <select value={signupTeam} onChange={(e) => setSignupTeam(e.target.value)} className="input-field" required disabled={isLoading}>
                <option value="">Select a team...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Who Referred You? *</label>
              <select value={signupReferredBy} onChange={(e) => setSignupReferredBy(e.target.value)} className="input-field" required disabled={isLoading}>
                <option value="">Select...</option>
                {approvedUsers.map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                ))}
                <option value="__other__">Other (type below)</option>
              </select>
              {signupReferredBy === '__other__' && (
                <input type="text" value={signupReferredByOther} onChange={(e) => setSignupReferredByOther(e.target.value)} placeholder="Who referred you?" className="input-field mt-2" required disabled={isLoading} />
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
              {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>) : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {mode === 'signin' 
            ? "Don't have an account? Switch to Sign Up above." 
            : "Already have an account? Switch to Sign In above."}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
