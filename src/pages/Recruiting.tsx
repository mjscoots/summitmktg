import { useNavigate } from "react-router-dom";
import { ArrowRight, Mountain, Users, Target, Trophy, DollarSign, Calendar, Zap, CheckCircle } from "lucide-react";
import summitLogo from "@/assets/summit-logo-new.png";

const Recruiting = () => {
  const navigate = useNavigate();

  const benefits = [
    { icon: DollarSign, title: "High Income Potential", description: "Earn based on your effort, not an hourly cap. Top performers make $30k+ in a single summer." },
    { icon: Calendar, title: "4-Month Sprint", description: "Work hard for one season. Build skills, capital, and connections that last a lifetime." },
    { icon: Users, title: "Team Culture", description: "Join a brotherhood of competitive, driven individuals who push each other to be better." },
    { icon: Trophy, title: "Real Competition", description: "Weekly leaderboards, team challenges, and recognition for top performers." },
    { icon: Target, title: "Proven System", description: "Battle-tested scripts, training, and support from day one. No guesswork." },
    { icon: Zap, title: "Fast Results", description: "Start earning within your first week. No months of training before you see income." },
  ];

  const whoWeAreLookingFor = [
    "Competitive athletes or former athletes",
    "People who hate the idea of a normal 9-5",
    "Anyone looking for a high-income skill",
    "College students wanting to maximize their summer",
    "Entrepreneurs who want real sales experience",
  ];

  const handleApplyClick = (path: string) => {
    // Navigate and ensure scroll to top
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Mountain className="w-5 h-5 text-primary" />
            <span className="text-lg font-black tracking-tight uppercase">Summit</span>
          </button>
          <div className="flex items-center gap-4">
            <a
              href="#apply"
              className="btn-primary text-sm"
            >
              Apply Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <img 
              src={summitLogo} 
              alt="Summit Marketing" 
              className="w-64 md:w-80 mx-auto"
              style={{
                filter: 'drop-shadow(0 0 20px hsl(216, 80%, 45%, 0.35))',
              }}
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 uppercase tracking-tight">
            Your Summer. <span className="text-primary">Your Income.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Summit Marketing is looking for driven individuals ready to work hard, 
            compete, and earn more in 4 months than most make in a year.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#apply"
              className="btn-primary text-lg px-8 py-4"
            >
              Start Your Application
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 uppercase tracking-wide">
              Why Summit?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We're not just another sales job. We're building the next generation of entrepreneurs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="card-elevated p-6 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We're Looking For */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 uppercase tracking-wide">
              Who We're Looking For
            </h2>
            <p className="text-muted-foreground">
              Summit isn't for everyone. But if you're the right fit, it'll change your life.
            </p>
          </div>
          
          <div className="card-elevated p-8">
            <ul className="space-y-4">
              {whoWeAreLookingFor.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Two Paths Section - Now includes Apply page content */}
      <section id="apply" className="py-20 bg-secondary/30 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mountain className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 uppercase tracking-tight">
              Choose Your Path
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Select the application that best matches your experience level. 
              Each path is designed to set you up for success.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Rookie Path */}
            <button
              onClick={() => handleApplyClick("/apply/rookie")}
              className="card-elevated p-8 text-left hover:border-accent/50 transition-all group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Users className="w-8 h-8 text-accent" />
              </div>
              
              <h3 className="text-2xl font-black text-foreground mb-2 uppercase tracking-wide">
                Rookie
              </h3>
              
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
              onClick={() => handleApplyClick("/apply/veteran")}
              className="card-elevated p-8 text-left hover:border-primary/50 transition-all group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-2xl font-black text-foreground mb-2 uppercase tracking-wide">
                Veteran
              </h3>
              
              <p className="text-muted-foreground mb-6">
                <span className="text-primary font-semibold">Prior D2D experience?</span> Join with 
                instant marketing deals and the ability to build your own team.
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
          <div className="mt-12 text-center">
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Mountain className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 uppercase tracking-wide">
            Ready to Find the Summit?
          </h2>
          <p className="text-muted-foreground mb-8">
            Stop wondering "what if" and start building the life you want.
          </p>
          <a
            href="#apply"
            className="btn-primary text-lg px-10 py-4 inline-flex items-center"
          >
            Start Your Application
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Summit Marketing © 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://www.instagram.com/summitmktgsales/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Instagram
              </a>
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Member Login
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Recruiting;
