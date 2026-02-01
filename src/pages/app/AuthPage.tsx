import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Manager list for dropdown
const MANAGERS = [
  "Joshua Bingham",
  "Alex Martinez",
  "Sarah Johnson", 
  "Michael Chen",
  "Emily Davis",
  "David Wilson",
  "Jessica Brown",
  "Ryan Thompson",
  "Amanda Garcia",
  "Chris Anderson",
  "Lauren Taylor",
  "Kevin Lee",
  "Rachel White",
  "Brandon Harris",
  "Nicole Clark",
];

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Sign up state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState<string>("");
  const [accessType, setAccessType] = useState<"rookie" | "manager" | "">("");
  const [directManager, setDirectManager] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Shared state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter managers based on search
  const filteredManagers = useMemo(() => {
    if (!managerSearch) return MANAGERS;
    return MANAGERS.filter(m => 
      m.toLowerCase().includes(managerSearch.toLowerCase())
    );
  }, [managerSearch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setError(error.message);
      toast.error("Login failed", { description: error.message });
      setIsLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/app", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (!fullName.trim() || !email.trim() || !phone.trim() || !directManager || !accessType || !accessCode.trim()) {
      setError("All fields are required");
      return;
    }

    // Validate access codes
    const expectedCode = accessType === 'rookie' ? 'rookie2026' : 'summit2026';
    if (accessCode.toLowerCase() !== expectedCode.toLowerCase()) {
      setError(`Invalid access code for ${accessType} access`);
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
      // Split full name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error: fnError } = await supabase.functions.invoke("validate-signup", {
        body: {
          accessCode: accessCode.trim(),
          firstName,
          lastName,
          email: email.trim(),
          password,
          phone: phone.trim(),
          directManager,
          role: accessType,
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
        setActiveTab('login');
        setLoginEmail(email);
        setIsLoading(false);
        return;
      }

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

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Summit</h1>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-8 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setActiveTab('login')}
            className={cn(
              'flex-1 py-2.5 rounded-md font-medium text-sm transition-all duration-200',
              activeTab === 'login'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Log In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={cn(
              'flex-1 py-2.5 rounded-md font-medium text-sm transition-all duration-200',
              activeTab === 'signup'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className="input-field"
                required
                disabled={isLoading}
              />
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
                Experience Level
              </label>
              <Select
                value={experience}
                onValueChange={setExperience}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rookie">Rookie (new to D2D)</SelectItem>
                  <SelectItem value="some">Some experience</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Access Type *
              </label>
              <Select
                value={accessType}
                onValueChange={(v: "rookie" | "manager") => setAccessType(v)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rookie">Rookie Access</SelectItem>
                  <SelectItem value="manager">Manager Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Direct Manager *
              </label>
              <Select
                value={directManager}
                onValueChange={setDirectManager}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your manager" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5">
                    <Input
                      placeholder="Search managers..."
                      value={managerSearch}
                      onChange={(e) => setManagerSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {filteredManagers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
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
                {accessType === 'rookie' ? 'Use code: rookie2026' : accessType === 'manager' ? 'Use code: summit2026' : 'Select access type first'}
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
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="btn-primary w-full mt-6"
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
        )}
      </div>
    </div>
  );
};

export default AuthPage;
