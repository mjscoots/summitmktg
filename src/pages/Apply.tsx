import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Trophy, Mountain } from "lucide-react";

const Apply = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/recruiting")}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recruiting
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mountain className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 uppercase tracking-tight">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select the application that best matches your experience level. 
            Each path is designed to set you up for success.
          </p>
        </div>

        {/* Path Selection */}
        <div className="grid md:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Rookie Path */}
          <button
            onClick={() => navigate("/apply/rookie")}
            className="card-elevated p-8 text-left hover:border-accent/50 transition-all group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
              <Users className="w-8 h-8 text-accent" />
            </div>
            
            <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-wide">
              Rookie
            </h2>
            
            <p className="text-muted-foreground mb-6">
              <span className="text-accent font-semibold">No experience required.</span> Perfect for college students, 
              athletes, or anyone ready to learn a high-income skill from scratch.
            </p>
            
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                Full training & mentorship
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                Proven scripts & systems
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                Team housing available
              </li>
            </ul>
            
            <div className="flex items-center text-accent font-bold uppercase tracking-wide group-hover:translate-x-1 transition-transform">
              Apply as Rookie
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Veteran Path */}
          <button
            onClick={() => navigate("/apply/veteran")}
            className="card-elevated p-8 text-left hover:border-primary/50 transition-all group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-wide">
              Veteran
            </h2>
            
            <p className="text-muted-foreground mb-6">
              <span className="text-primary font-semibold">Prior D2D experience?</span> Join with higher pay, 
              instant marketing deals, and the ability to build your own team.
            </p>
            
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Top-tier commission structure
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Uncapped recruiting overrides
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Elite systems & AI tools
              </li>
            </ul>
            
            <div className="flex items-center text-primary font-bold uppercase tracking-wide group-hover:translate-x-1 transition-transform">
              Apply as Veteran
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm text-muted-foreground">
            Not sure which path is right for you?{" "}
            <a 
              href="https://www.instagram.com/summitmktgsales/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              DM us on Instagram
            </a>{" "}
            and we'll help you decide.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Apply;
