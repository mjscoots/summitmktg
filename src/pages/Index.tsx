import { useNavigate } from "react-router-dom";
import { ArrowRight, Mountain } from "lucide-react";
import summitLogo from "@/assets/summit-logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      {/* Mountain accents in corners */}
      <Mountain className="absolute top-6 left-6 w-5 h-5 text-primary/20" />
      <Mountain className="absolute top-6 right-6 w-5 h-5 text-primary/20" />

      <div className="relative z-10 max-w-2xl mx-auto text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-12">
          <img 
            src={summitLogo} 
            alt="Summit Marketing" 
            className="w-64 md:w-80 mx-auto"
          />
        </div>

        {/* Main Question */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-lg">
            Four months. High upside. Clear training. Real leadership.
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
                New to D2D Pest
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">I'm a Rookie</h3>
            <p className="text-muted-foreground text-sm">
              Starting fresh.
            </p>
          </button>

          <button
            onClick={() => navigate("/apply/vet")}
            className="group card-elevated p-8 text-left transition-all duration-150 hover:border-primary"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                Experienced Rep/Leader
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">I'm a Vet</h3>
            <p className="text-muted-foreground text-sm">
              Ready to lead. Build your team.
            </p>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-20 mb-12">
          <button
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Already have an account? <span className="text-primary font-medium">Sign in</span>
          </button>
        </div>
      </div>

      {/* Bottom mountain accents */}
      <Mountain className="absolute bottom-6 left-6 w-5 h-5 text-primary/20" />
      <Mountain className="absolute bottom-6 right-6 w-5 h-5 text-primary/20" />
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/20" />
    </div>
  );
};

export default Index;
