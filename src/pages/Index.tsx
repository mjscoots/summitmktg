import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center animate-fade-in">
        {/* Logo/Brand */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Sales<span className="text-gradient">School</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Train. Track. Close.
          </p>
        </div>

        {/* Main Question */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Are you a Rookie or a Vet?
          </h2>
          <p className="text-muted-foreground">
            Select your path to get started
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-xl mx-auto">
          <button
            onClick={() => navigate("/apply/rookie")}
            className="group card-elevated p-8 text-left transition-all duration-300 hover:border-primary/50 hover:glow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                New to Sales
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Rookie</h3>
            <p className="text-muted-foreground text-sm">
              Starting fresh. Ready to learn the fundamentals and build your foundation.
            </p>
          </button>

          <button
            onClick={() => navigate("/apply/vet")}
            className="group card-elevated p-8 text-left transition-all duration-300 hover:border-primary/50 hover:glow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Experienced
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Vet</h3>
            <p className="text-muted-foreground text-sm">
              Years in the game. Looking to sharpen skills and level up.
            </p>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-12">
          <button
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Already have an account? <span className="text-primary">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
