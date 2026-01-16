import { useNavigate } from "react-router-dom";
import { ArrowRight, Mountain, User } from "lucide-react";
import summitLogo from "@/assets/summit-logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/30" />

      {/* Mountain accent in left corner */}
      <Mountain className="absolute top-6 left-6 w-5 h-5 text-primary/20" />
      
      {/* Login button top right - larger and bolder with user icon */}
      <button
        onClick={() => navigate("/login")}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 text-sm font-bold text-foreground hover:text-primary border-2 border-primary rounded transition-colors uppercase tracking-wide"
      >
        <User className="w-4 h-4" />
        Log In
      </button>

      <div className="relative z-10 max-w-2xl mx-auto text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-4">
          <img 
            src={summitLogo} 
            alt="Summit Marketing" 
            className="w-64 md:w-80 mx-auto"
          />
        </div>

        {/* Main Question - moved closer to logo */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 uppercase tracking-wide">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-lg">
            Four months. High upside. Clear training. Real leadership.
          </p>
        </div>

        {/* Selection Cards - Bold styling with thicker borders */}
        <div className="grid md:grid-cols-2 gap-4 max-w-xl mx-auto">
          <button
            onClick={() => navigate("/apply/rookie")}
            className="group bg-card p-8 text-left transition-all duration-150 border-[3px] border-primary rounded-lg hover:bg-primary/5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                New to Door-to-Door
              </span>
              <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 uppercase">I'm a Rookie</h3>
            <p className="text-muted-foreground text-sm uppercase tracking-wide">
              Interested in Sales
            </p>
          </button>

          <button
            onClick={() => navigate("/apply/vet")}
            className="group bg-card p-8 text-left transition-all duration-150 border-[3px] border-primary rounded-lg hover:bg-primary/5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Experienced Rep
              </span>
              <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 uppercase">I'm a Vet</h3>
            <p className="text-muted-foreground text-sm uppercase tracking-wide">
              Completed a Summer of Door-to-Door Sales
            </p>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-16 mb-12">
          <button
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Already a member? <span className="text-primary font-medium">Sign in</span>
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
