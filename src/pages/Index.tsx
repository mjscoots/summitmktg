import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ArrowRight } from "lucide-react";
import summitLogo from "@/assets/summit-logo-new.png";
import { LiveCounters } from "@/components/recruiting/LiveCounters";

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));
const VetCalculator = lazy(() => import("@/components/VetCalculator"));

/**
 * Public cover page — gold on black, single industry (pest) messaging.
 * Multi-industry content lives only inside the authenticated app.
 */
const Index = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [calcMode, setCalcMode] = useState<'rookie' | 'vet'>('rookie');

  // Preload logo then reveal — short timeout to avoid stuck loading screen
  useEffect(() => {
    const img = new Image();
    img.src = summitLogo;
    img.onload = () => setReady(true);
    img.onerror = () => setReady(true);
    if (img.complete) { setReady(true); return; }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const scrollToEarnings = () => {
    document.getElementById('earnings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!ready) {
    return (
      <div className="gold-world min-h-screen bg-background flex items-center justify-center">
        <span className="micro-label text-muted-foreground">Loading</span>
      </div>
    );
  }

  return (
    <div className="gold-world min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Calm premium background — deep near-black with a soft gold halo and faint texture */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, hsl(46 65% 52% / 0.16), transparent 62%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(hsl(46 40% 80%) 0.5px, transparent 0.5px)',
            backgroundSize: '3px 3px',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: 'linear-gradient(to top, hsl(0 0% 0% / 0.7), transparent)' }}
        />
      </div>

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, hsl(46 65% 52% / 0.5), transparent)' }}
      />

      {/* Navigation */}
      <nav className="relative z-20 w-full px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            aria-label="Summit Marketing home"
            className="flex min-h-11 items-center gap-2.5 text-foreground/80 hover:text-foreground transition-colors">
            <img src={summitLogo} alt="" className="h-6 w-auto" />
            <span className="text-lg font-black tracking-tight uppercase">Summit</span>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/60 px-4 text-sm font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary">
            <LogIn className="w-4 h-4" />
            Log in
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="mb-8 relative">
              <img
                src={summitLogo}
                alt="Summit Marketing"
                className="w-64 md:w-80 mx-auto relative z-10"
                style={{ filter: 'drop-shadow(0 0 20px hsl(46 65% 52% / 0.28))' }}
                loading="eager"
                fetchPriority="high" />
            </div>

            <h1
              className="mb-4 text-4xl md:text-6xl font-black uppercase tracking-tight text-foreground"
              style={{ letterSpacing: '-0.02em' }}>
              Summit Marketing
            </h1>
            <p className="mx-auto max-w-xl text-base md:text-lg text-muted-foreground">
              We train and field door-to-door sales reps. You knock, you close, you get paid on what you close.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <button
                onClick={scrollToEarnings}
                className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold uppercase tracking-wide whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90">
                See what you'd make
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/recruiting")}
                className="flex-1 inline-flex min-h-12 items-center justify-center rounded-xl border border-primary/60 px-6 text-sm font-bold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary">
                Apply
              </button>
            </div>

            <div className="mt-8">
              <LiveCounters variant="inline" />
            </div>
          </div>
        </div>

        {/* Calculators */}
        <div id="earnings" className="relative z-10 max-w-4xl mx-auto w-full px-6 py-16 space-y-8 scroll-mt-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight mb-2">
              Estimate Your Earnings
            </h2>
            <p className="text-muted-foreground text-sm">See what you could make this summer.</p>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius)]" />}>
            <EarningsCalculator />
          </Suspense>
        </div>

        {/* Apply CTA */}
        <div className="relative z-10 text-center py-16 px-6">
          <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight mb-3">
            Ready to Start?
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Applications take a few minutes.
          </p>
          <button
            onClick={() => navigate("/apply")}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Apply Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            © 2026 Summit Marketing
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/recruiting")}
              className="micro-label inline-flex min-h-11 items-center rounded-xl px-3 transition-colors hover:text-primary">
              Recruiting
            </button>
            <button
              onClick={() => navigate("/apply")}
              className="micro-label inline-flex min-h-11 items-center rounded-xl px-3 transition-colors hover:text-primary">
              Apply
            </button>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="micro-label inline-flex min-h-11 items-center rounded-xl px-3 transition-colors hover:text-primary">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>);
};

export default Index;
