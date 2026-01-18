import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mountain, User } from "lucide-react";
import summitLogo from "@/assets/summit-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const [rookieHovered, setRookieHovered] = useState(false);
  const [vetHovered, setVetHovered] = useState(false);

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
        {/* Logo with glow effect */}
        <div className="mb-4 relative">
          {/* Blue glow behind logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 md:w-64 h-24 md:h-32 bg-primary/30 blur-3xl rounded-full" />
          </div>
          <img 
            src={summitLogo} 
            alt="Summit Marketing" 
            className="w-64 md:w-80 mx-auto relative z-10 drop-shadow-[0_0_20px_hsl(216,80%,45%,0.4)]"
          />
        </div>

        {/* Main Question - moved closer to logo */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 uppercase tracking-wide drop-shadow-[0_0_10px_hsl(216,80%,45%,0.3)]">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-lg">
            Four months. High upside. Clear training. Real leadership.
          </p>
        </div>

        {/* Selection Cards - Bold styling with enhanced hover */}
        <div className="grid md:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Rookie Card */}
          <button
            onClick={() => navigate("/apply/rookie")}
            onMouseEnter={() => setRookieHovered(true)}
            onMouseLeave={() => setRookieHovered(false)}
            className="group bg-card p-8 text-center transition-all duration-300 border-[3px] border-primary rounded-lg hover:bg-primary/5 hover:scale-[1.04] hover:shadow-[0_10px_40px_-10px_hsl(216,80%,45%,0.5)] hover:border-primary/80 cursor-pointer"
          >
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                New to Door-to-Door
              </span>
            </div>
            
            {/* Center text with glow and stroke effect */}
            <div className="relative my-6">
              <h3 
                className="text-3xl font-black text-foreground uppercase tracking-wider transition-all duration-300"
                style={{
                  textShadow: '0 0 20px hsl(216, 80%, 45%, 0.5), 0 0 40px hsl(216, 80%, 45%, 0.3)',
                  WebkitTextStroke: '1px hsl(0, 0%, 0%)',
                }}
              >
                {rookieHovered ? "GO!" : "ROOKIE"}
              </h3>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Interested in Sales
            </p>
          </button>

          {/* Vet Card */}
          <button
            onClick={() => navigate("/apply/vet")}
            onMouseEnter={() => setVetHovered(true)}
            onMouseLeave={() => setVetHovered(false)}
            className="group bg-card p-8 text-center transition-all duration-300 border-[3px] border-primary rounded-lg hover:bg-primary/5 hover:scale-[1.04] hover:shadow-[0_10px_40px_-10px_hsl(216,80%,45%,0.5)] hover:border-primary/80 cursor-pointer"
          >
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Experienced Rep
              </span>
            </div>
            
            {/* Center text with glow and stroke effect */}
            <div className="relative my-6">
              <h3 
                className="text-3xl font-black text-foreground uppercase tracking-wider transition-all duration-300"
                style={{
                  textShadow: '0 0 20px hsl(216, 80%, 45%, 0.5), 0 0 40px hsl(216, 80%, 45%, 0.3)',
                  WebkitTextStroke: '1px hsl(0, 0%, 0%)',
                }}
              >
                {vetHovered ? "GO!" : "VET"}
              </h3>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Completed Summer Door-to-Door Sales
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
