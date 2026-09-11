import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowDown, ArrowRight, DoorOpen, Handshake, Wallet } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MountainRange } from "@/components/brand/MountainRange";
import { PublicProofStrip } from "@/components/recruiting/LiveCounters";
import ThreeDoorSection from "@/components/recruiting/ThreeDoorSection";
import { ProductionTicker } from "@/components/recruiting/ProductionTicker";
import { usePublicCalc } from "@/hooks/usePublicCalc";
import { Button } from "@/components/ui/button";
import { COVER_STATS } from "@/lib/coverStats";

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));

const WHAT_WE_DO = [
  { icon: DoorOpen, title: "Knock", line: "You work a set area with a script you have practised." },
  { icon: Handshake, title: "Close", line: "You sign the account at the door and log it the same day." },
  { icon: Wallet, title: "Get paid", line: "You are paid on what you close, not on hours." },
];

const SEASON_STEPS = [
  { title: "Apply", line: "A short form, then a call with a manager." },
  { title: "Train", line: "Scripts, product and practice before you knock." },
  { title: "Sell the season", line: "You work an area with your team through the summer." },
  { title: "Settle up", line: "Your pay follows the scale you reached." },
];

/**
 * Public front door for Trinity Sales.
 *
 * Pass 175 restores the sections and copy that stood before Pass 170 and
 * restyles them on the new system: the range behind the hero, the TRNTY
 * lockup, one lime action per section and blue for links.
 */
const Index = () => {
  const navigate = useNavigate();
  const calc = usePublicCalc();
  const [offset, setOffset] = useState(0);

  // Slow parallax on the range, off under prefers-reduced-motion.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.getElementById('root');
    const target: HTMLElement | Window = el || window;
    const onScroll = () => {
      const y = el ? el.scrollTop : window.scrollY;
      setOffset(y * 0.15);
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToEarnings = () => {
    document.getElementById('earnings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasPublishedBands = Boolean(calc?.pay_scale?.bands?.length);

  return (
    <div className="gold-world public-world min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" aria-label="Trinity home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={26} />
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Link to="/industries/pest" className="inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:px-3">
              Pest
            </Link>
            <Link to="/industries/fiber" className="inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:px-3">
              Fiber
            </Link>
            <Link to="/login" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ice">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero: the range sits behind the headline, bottom aligned. */}
        <section className="public-cover relative isolate overflow-hidden px-5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[68%] sm:h-[74%]"
            style={{ transform: `translateY(${offset}px)` }}
            aria-hidden="true"
          >
            <MountainRange />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[min(760px,calc(100svh-69px))] max-w-6xl flex-col justify-end pb-16 pt-24 sm:pb-20 md:pb-24 md:pt-32">
            <div className="max-w-4xl">
              <Wordmark variant="hero" height={72} className="mb-8" />
              <h1 className="font-display font-bold !text-[clamp(2.25rem,8vw,5rem)] !leading-[1.02] tracking-tight text-foreground">
                Financial freedom.<br />Done differently.
              </h1>
              {COVER_STATS && <PublicProofStrip />}
              <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                A performance-based path through sales, training, and team leadership.
              </p>
            </div>

            <div className="mt-9 flex w-full max-w-xl flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild className="min-h-12 w-full px-8 font-bold sm:w-auto">
                <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              {hasPublishedBands && (
                <button
                  type="button"
                  onClick={scrollToEarnings}
                  className="inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold text-ice"
                >
                  See what you could make <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Pest control now · Fiber internet in the off-season
            </p>
          </div>
        </section>

        <ThreeDoorSection />

        {/* What the work is */}
        <section className="bg-surface px-5 py-16 sm:px-6 md:py-24">
          <h2 className="sr-only">What the work is</h2>
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3 md:gap-12">
            {WHAT_WE_DO.map((c, index) => (
              <article key={c.title} className="public-process">
                <div className="mb-5 flex items-center justify-between">
                  <c.icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xs tabular-nums text-text-muted">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{c.line}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Calculator, still gated on a published pay scale */}
        {hasPublishedBands && (
          <section id="earnings" className="scroll-mt-20 px-5 py-16 sm:px-6 md:py-24">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Estimate your earnings
              </h2>
              <p className="mt-2 text-center text-sm text-text-secondary">
                Set the accounts and the weeks. The pay scale does the rest.
              </p>
              <div className="mt-8">
                <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                  <EarningsCalculator calcData={calc} onApplyClick={() => navigate('/apply/rookie')} />
                </Suspense>
              </div>
            </div>
          </section>
        )}

        {/* How the season works */}
        <section className="px-5 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              How the season works
            </h2>
            <ol className="mt-10">
              {SEASON_STEPS.map((s, i) => (
                <li key={s.title} className="grid gap-2 py-6 sm:grid-cols-[3rem_10rem_1fr] sm:items-baseline sm:gap-5">
                  <span className="text-xs tabular-nums text-primary">0{i + 1}</span>
                  <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-text-secondary">{s.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final band */}
        <section className="public-cta relative overflow-hidden bg-surface px-5 py-16 text-center sm:px-6 md:py-24">
          <div className="relative z-10 mx-auto max-w-xl">
            <Wordmark variant="hero" height={96} className="mx-auto" />
            <p className="mt-6 text-base text-text-secondary">Applications take a few minutes.</p>
            <Button asChild className="mt-7 min-h-12 px-8 font-bold">
              <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
            <p className="mt-8 text-sm text-text-secondary">
              Already on the team,{' '}
              <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-ice underline underline-offset-4">
                sign in
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark variant="mark" height={26} />
            <div>
              <p className="text-sm font-semibold text-foreground">Trinity Sales</p>
              <p className="text-xs text-text-muted">© 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/parents" className="inline-flex min-h-11 items-center px-3 text-sm text-text-secondary transition-colors hover:text-foreground">
              For parents
            </Link>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center px-3 text-sm text-text-secondary transition-colors hover:text-foreground"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
      {COVER_STATS && <ProductionTicker />}
    </div>
  );
};

export default Index;
