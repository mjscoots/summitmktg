import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import summitLogo from "@/assets/summit-logo-new.png";

const Index = () => {
  const navigate = useNavigate();
  const [rookieHovered, setRookieHovered] = useState(false);
  const [vetHovered, setVetHovered] = useState(false);
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }>>([]);

  // Generate stars on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 3,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(220,30%,8%)] via-background to-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Starry background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: '3s',
            }}
          />
        ))}
        {/* Deep blue nebula accent */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Top-left brand anchor */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-6 flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors z-20"
      >
        <span className="text-lg font-black tracking-tight uppercase" style={{ textShadow: '0 0 10px hsl(216, 80%, 45%, 0.3)' }}>
          Summit
        </span>
      </button>
      
      {/* Login button top right */}
      <button
        onClick={() => navigate("/login")}
        className="absolute top-5 right-6 flex items-center gap-2 px-4 py-2 text-sm font-black text-foreground hover:text-primary border-2 border-primary/80 hover:border-primary rounded transition-all uppercase tracking-wider z-20"
      >
        <User className="w-4 h-4" />
        Log In
      </button>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Logo - loads instantly, no animation delay */}
        <div className="mb-6 relative">
          {/* Glow effect behind logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-56 md:w-72 h-28 md:h-36 bg-primary/25 blur-3xl rounded-full" />
          </div>
          <img 
            src={summitLogo} 
            alt="Summit Marketing" 
            className="w-72 md:w-96 mx-auto relative z-10"
            style={{
              filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.5)) drop-shadow(0 0 2px rgba(255,255,255,0.3)) drop-shadow(0 0 8px rgba(255,255,255,0.4)) drop-shadow(0 0 20px hsl(216, 80%, 45%, 0.35)) drop-shadow(0 0 40px hsl(216, 80%, 45%, 0.15))',
            }}
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {/* Main Question */}
        <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 
            className="text-4xl md:text-5xl font-black text-foreground mb-4 uppercase tracking-tight"
            style={{
              textShadow: '0 0 30px hsl(216, 80%, 45%, 0.4), 0 0 60px hsl(216, 80%, 45%, 0.2)',
              letterSpacing: '-0.02em',
            }}
          >
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-lg font-medium tracking-wide">
            Four months. High upside. Clear training. Real leadership.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {/* Rookie Card */}
          <button
            onClick={() => navigate("/apply/rookie")}
            onMouseEnter={() => setRookieHovered(true)}
            onMouseLeave={() => setRookieHovered(false)}
            className="group bg-card/80 backdrop-blur-sm p-7 text-center transition-all duration-300 border-2 border-primary/60 rounded-2xl hover:bg-primary/10 hover:scale-[1.04] hover:shadow-[0_8px_40px_-8px_hsl(216,80%,45%,0.7)] hover:border-primary cursor-pointer"
          >
            <span className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-4 h-4">
              New to Door-to-Door
            </span>
            
            <h3 
              className="text-3xl font-black text-foreground uppercase tracking-tight transition-all duration-300 my-4"
              style={{
                textShadow: '0 0 20px hsl(216, 80%, 45%, 0.6), 0 0 40px hsl(216, 80%, 45%, 0.3)',
              }}
            >
              {rookieHovered ? "GO!" : "ROOKIE"}
            </h3>
            
            <p className="text-muted-foreground text-xs font-medium h-8 flex items-center justify-center">
              Interested in Sales
            </p>
          </button>

          {/* Vet Card */}
          <button
            onClick={() => navigate("/apply/vet")}
            onMouseEnter={() => setVetHovered(true)}
            onMouseLeave={() => setVetHovered(false)}
            className="group bg-card/80 backdrop-blur-sm p-7 text-center transition-all duration-300 border-2 border-primary/60 rounded-2xl hover:bg-primary/10 hover:scale-[1.04] hover:shadow-[0_8px_40px_-8px_hsl(216,80%,45%,0.7)] hover:border-primary cursor-pointer"
          >
            <span className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-4 h-4">
              Experienced Rep
            </span>
            
            <h3 
              className="text-3xl font-black text-foreground uppercase tracking-tight transition-all duration-300 my-4"
              style={{
                textShadow: '0 0 20px hsl(216, 80%, 45%, 0.6), 0 0 40px hsl(216, 80%, 45%, 0.3)',
              }}
            >
              {vetHovered ? "GO!" : "VET"}
            </h3>
            
            <p className="text-muted-foreground text-xs font-medium h-8 flex items-center justify-center">
              Completed Summer Door-to-Door Sales
            </p>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-14 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Already a member? <span className="text-primary font-semibold">Sign in</span>
          </button>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
};

export default Index;
