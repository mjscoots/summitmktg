import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogIn, ArrowRight, Mountain } from "lucide-react";
import summitLogo from "@/assets/summit-logo-new.png";

const Index = () => {
  const navigate = useNavigate();
  const [stars, setStars] = useState<Array<{id: number;x: number;y: number;size: number;opacity: number;delay: number;}>>([]);

  // Generate stars on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 3
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(220,30%,8%)] via-background to-background flex flex-col relative overflow-hidden">
      {/* Starry background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) =>
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
            animationDuration: '3s'
          }} />

        )}
        {/* Deep blue nebula accent */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Navigation */}
      <nav className="relative z-20 w-full px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">

            <Mountain className="w-5 h-5 text-primary" />
            <span className="text-lg font-black tracking-tight uppercase" style={{ textShadow: '0 0 10px hsl(216, 80%, 45%, 0.3)' }}>
              Summit
            </span>
          </button>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/recruiting")}
              className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">

              Learn More
            </button>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-black text-foreground hover:text-primary border-2 border-primary/80 hover:border-primary rounded transition-all uppercase tracking-wider">

              <LogIn className="w-4 h-4" />
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 md:w-72 h-28 md:h-36 bg-primary/25 blur-3xl rounded-full" />
            </div>
            <img
              src={summitLogo}
              alt="Summit Marketing"
              className="w-72 md:w-96 mx-auto relative z-10"
              style={{
                filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.5)) drop-shadow(0 0 2px rgba(255,255,255,0.3)) drop-shadow(0 0 8px rgba(255,255,255,0.4)) drop-shadow(0 0 20px hsl(216, 80%, 45%, 0.35)) drop-shadow(0 0 40px hsl(216, 80%, 45%, 0.15))'
              }}
              loading="eager"
              fetchPriority="high" />

          </div>

          {/* Main Heading */}
          <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1
              className="text-4xl md:text-5xl font-black text-foreground mb-4 uppercase tracking-tight"
              style={{
                textShadow: '0 0 30px hsl(216, 80%, 45%, 0.4), 0 0 60px hsl(216, 80%, 45%, 0.2)',
                letterSpacing: '-0.02em'
              }}>

              Summit Marketing
            </h1>
            <p className="text-muted-foreground text-lg font-medium tracking-wide">
              Door-to-door sales. Done differently.
            </p>
          </div>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Recruiting CTA */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <button
                onClick={() => navigate("/recruiting")}
                className="w-full group bg-primary py-4 px-6 text-center transition-all duration-300 rounded-xl hover:scale-[1.02] hover:shadow-[0_8px_40px_-8px_hsl(216,80%,45%,0.7)] cursor-pointer">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-bold text-primary-foreground uppercase tracking-wide">
                    Learn More
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary-foreground" />
                </div>
              </button>
              <span className="text-xs text-muted-foreground font-medium">New to Summit?</span>
            </div>
            
            {/* Member Login CTA */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <button
                onClick={() => navigate("/login")}
                className="w-full group bg-primary/10 backdrop-blur-sm py-4 px-6 text-center transition-all duration-300 border-2 border-primary rounded-xl hover:bg-primary hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center justify-center gap-2">
                  <User className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                  <span className="text-base font-bold text-foreground group-hover:text-primary-foreground uppercase tracking-wide transition-colors">
                    Member Login
                  </span>
                </div>
              </button>
              <span className="text-xs text-muted-foreground font-medium">Sign In / Sign Up</span>
            </div>
          </div>
          
          





        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            © 2026 Summit Marketing
          </span>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/recruiting")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">

              Recruiting
            </button>
            <button
              onClick={() => navigate("/apply")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">

              Apply
            </button>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors">

              Instagram
            </a>
          </div>
        </div>
      </footer>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>);

};

export default Index;