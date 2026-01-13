import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      <div className="relative z-10 max-w-2xl mx-auto text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            SUMMIT <span className="text-primary">MKTG</span>
          </h1>
        </div>

        {/* Main Question */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Are you a Rookie or a Vet?
          </h2>
          <p className="text-muted-foreground">
            Select your path to get started
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-4 max-w-xl mx-auto">
          <button
            onClick={() => navigate("/apply/rookie")}
            className="group card-elevated p-8 text-left transition-all duration-150 hover:border-primary"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                New to Sales
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Rookie</h3>
            <p className="text-muted-foreground text-sm">
              Starting fresh. Ready to learn the fundamentals.
            </p>
          </button>

          <button
            onClick={() => navigate("/apply/vet")}
            className="group card-elevated p-8 text-left transition-all duration-150 hover:border-primary"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                Experienced
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Vet</h3>
            <p className="text-muted-foreground text-sm">
              Years in the game. Looking to level up.
            </p>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-12">
          <button
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Already have an account? <span className="text-primary font-medium">Sign in</span>
          </button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/20" />
    </div>
  );
};

export default Index;
