import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { LiveCounters } from "@/components/recruiting/LiveCounters";

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));

/**
 * Public cover page — ice palette, single industry (pest) messaging.
 * Multi-industry content lives only inside the authenticated app.
 */
const Index = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // The wordmark is inline SVG, so there is nothing to preload — reveal on mount.
  useEffect(() => {
    setReady(true);
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
      {/* Calm background — deep ice with a soft halo and faint texture */}
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
            aria-label="Summit home"
            className="flex min-h-11 items-center gap-2.5 text-foreground/80 hover:text-foreground transition-colors">
            <Wordmark variant="compact" height={36} />
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
            <div className="mb-6 relative">
              {/* The logo carries the name, so the heading stays for search only. */}
              <Wordmark variant="hero" height={200} className="relative z-10 mx-auto !h-auto w-full max-w-full sm:max-w-md" />
            </div>

            <h1 className="sr-only">Summit Marketing</h1>
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

            <p className="mt-4 text-xs text-muted-foreground">
              Also running:{' '}
              <Link to="/industries/fiber" className="underline hover:text-foreground">
                Fiber Internet
              </Link>{' '}
              (winter) ·{' '}
              <Link to="/industries/life" className="underline hover:text-foreground">
                Life Insurance
              </Link>{' '}
              (coming)
            </p>


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
          <div className="flex items-center gap-2">
            <Wordmark variant="compact" height={32} />
            <span className="text-xs text-muted-foreground">© 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/recruiting")}
              className="micro-label inline-flex min-h-11 items-center rounded-xl px-3 transition-colors hover:text-primary">
              Summer Jobs
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
