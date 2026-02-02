import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  // Login state - support email OR phone
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Detect if input looks like a phone number
  const isPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 10 && !value.includes("@");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    let email = identifier;
    
    // If it looks like a phone number, we need to look up the email
    // For now, assume email login - phone lookup would require a backend call
    if (isPhoneNumber(identifier)) {
      setError("Please use your email address to log in.");
      setIsLoading(false);
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast.error("Login failed", { description: error.message });
      setIsLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/app", { replace: true });
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

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Summit</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access your dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This is a closed system. Contact your manager if you need access.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
