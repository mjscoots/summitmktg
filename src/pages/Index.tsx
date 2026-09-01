import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowDown, ArrowRight, DoorOpen, Handshake, Wallet } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { PublicProofStrip } from "@/components/recruiting/LiveCounters";
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

/** Public front door: a focused, high-contrast cover for Summit. */
const Index = () => {
  const navigate = useNavigate();
  const calc = usePublicCalc();

  const scrollToEarnings = () => {
    document.getElementById('earnings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="gold-world public-world min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" aria-label="Summit home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={36} />
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Link to="/industries/pest" className="inline-flex min-h-11 items-center rounded-xl px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:px-3">
              Pest
            </Link>
            <Link to="/industries/fiber" className="inline-flex min-h-11 items-center rounded-xl px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:px-3">
              Fiber
            </Link>
            <Button asChild variant="outline" className="min-h-11 whitespace-nowrap px-3">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="public-cover relative isolate overflow-hidden px-5 sm:px-6">
          <div className="public-cover-mark" aria-hidden="true">
            <Wordmark variant="mark" height={740} className="h-full w-full" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[min(760px,calc(100svh-69px))] max-w-6xl flex-col justify-end pb-16 pt-28 sm:pb-20 md:pb-24 md:pt-36">
            <div className="max-w-4xl">
              <p className="micro-label text-primary">Summit Marketing</p>
              <h1 className="public-cover-title mt-5 max-w-4xl font-display text-[3.15rem] font-extrabold leading-[0.98] tracking-normal text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                Financial freedom.<br />Done differently.
              </h1>
              {COVER_STATS && <PublicProofStrip />}
              <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                A performance-based path through sales, training, and team leadership.
              </p>
            </div>

            <div className="mt-9 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <Button onClick={scrollToEarnings} className="public-primary-cta min-h-12 flex-1 px-6 font-bold">
                See what you could make <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button asChild variant="outline" className="min-h-12 flex-1 px-6 font-bold">
                <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Pest control now · Fiber internet in the off-season
            </p>

          </div>
        </section>

        {/* What the work is */}
        <section className="border-b border-border/70 px-5 py-16 sm:px-6 md:py-24">
          <h2 className="sr-only">What the work is</h2>
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3 md:gap-0">
            {WHAT_WE_DO.map((c, index) => (
              <article key={c.title} className="public-process md:px-8 md:first:pl-0 md:last:pr-0">
                <div className="mb-5 flex items-center justify-between">
                  <c.icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <span className="font-mono text-xs tabular-nums text-text-muted">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-extrabold text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{c.line}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Calculator */}
        <section id="earnings" className="public-band scroll-mt-20 px-5 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
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

        {/* How the season works */}
        <section className="px-5 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              How the season works
            </h2>
            <ol className="mt-10 border-t border-border">
              {SEASON_STEPS.map((s, i) => (
                <li key={s.title} className="grid gap-2 border-b border-border py-6 sm:grid-cols-[3rem_10rem_1fr] sm:items-baseline sm:gap-5">
                  <span className="font-mono text-xs tabular-nums text-primary">0{i + 1}</span>
                  <h3 className="text-lg font-extrabold text-foreground">{s.title}</h3>
                  <p className="text-sm text-text-secondary">{s.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final band */}
        <section className="public-cta relative overflow-hidden border-t border-border px-5 py-16 text-center sm:px-6 md:py-24">
          <div className="relative z-10 mx-auto max-w-xl">
            <Wordmark variant="hero" height={110} className="mx-auto !h-auto w-[70vw] max-w-[380px]" />
            <p className="mt-6 text-base text-text-secondary">Applications take a few minutes.</p>
            <Button asChild className="mt-7 min-h-12 px-8 font-bold">
              <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark variant="mark" height={28} className="text-text-secondary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Summit Marketing</p>
              <p className="text-xs text-text-muted">Summit Trinity · © 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/parents" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary transition-colors hover:text-foreground">
              For parents
            </Link>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary transition-colors hover:text-foreground"
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
