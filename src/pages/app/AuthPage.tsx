import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Wordmark } from '@/components/brand/Wordmark';
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const declinedReason = searchParams.get("reason") === "declined";
  const { signIn, isAuthenticated } = useAuth();
  
  // Self sign-up is closed. Invites are the only way in, so /signup and
  // /auth?mode=signup both land on sign in.
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  
  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [awaitingAuthRedirect, setAwaitingAuthRedirect] = useState(false);

  // Redirect as soon as auth session is present (profile can hydrate afterward)
  useEffect(() => {
    if (isAuthenticated) {
      setAwaitingAuthRedirect(false);
      setIsLoading(false);
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Safety net: never leave the button stuck on "Signing in"
  useEffect(() => {
    if (!awaitingAuthRedirect || isAuthenticated) return;

    const timeout = window.setTimeout(() => {
      setAwaitingAuthRedirect(false);
      setIsLoading(false);
      toast.error("Login timed out", { description: "Please try again." });
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [awaitingAuthRedirect, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double-click rapid-fire logins
    setAwaitingAuthRedirect(false);
    setError("");
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast.error("Login failed", { description: error.message });
      setIsLoading(false);
      return;
    }

    setAwaitingAuthRedirect(true);
  };

  return (
    <div className="gold-world public-auth min-h-screen flex items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
      <main className="relative z-10 w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/")}
          className="flex min-h-11 items-center text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-1 px-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-7">
          <div className="mx-auto mb-5 w-full max-w-[280px]">
            <Wordmark variant="heroMono" height={96} className="mx-auto h-auto w-full max-w-[280px]" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.01em] text-foreground mb-1">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to Summit.
          </p>
        </div>

        {declinedReason && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            Sorry, your logins are no longer valid. Please go back and repeat the sign-up process and your logins will be granted.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" required disabled={isLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pr-12" required disabled={isLoading} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
              {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing in</>) : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full min-h-11 text-center text-sm text-primary hover:text-primary/80 transition-colors mt-2"
            >
              Forgot your password?
            </button>
          </form>
        )}

        {/* SIGN UP */}
        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <p className="text-foreground font-medium">Check your email</p>
                <p className="text-muted-foreground text-sm">
                  If an account exists for <span className="font-medium text-foreground">{forgotEmail}</span>, we've sent a password reset link.
                </p>
                <button
                  onClick={() => { setMode('signin'); setForgotSent(false); setForgotEmail(''); }}
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                setError('');
                const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                setIsLoading(false);
                if (error) {
                  setError(error.message);
                } else {
                  setForgotSent(true);
                }
              }} className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" className="input-field" required disabled={isLoading} />
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary w-full min-h-12">
                  {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>) : "Send reset link"}
                </button>
                <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="w-full min-h-11 text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}

        {mode === 'signin' && (
          <div className="mt-8 space-y-1.5 text-center text-xs text-muted-foreground">
            <p>Have an invite? Open your link.</p>
            <p>Need an account? Ask your manager for an invite.</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default AuthPage;
