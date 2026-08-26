import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DoorOpen, Handshake, Wallet } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { LiveCounters } from "@/components/recruiting/LiveCounters";
import { usePublicCalc } from "@/hooks/usePublicCalc";

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));

const FALLBACK_TAGLINE = "Door-to-door sales, trained and run properly";

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

/** Public front door — Mono. Neutral #0B0D12, dotted grid, one accent. */
const Index = () => {
  const navigate = useNavigate();
  const calc = usePublicCalc();
  const tagline = calc?.settings?.public_tagline?.trim() || FALLBACK_TAGLINE;

  const scrollToEarnings = () => {
    document.getElementById('earnings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="gold-world min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/[0.88] backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" aria-label="Summit home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={36} />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/industries/pest" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary transition-colors hover:text-foreground">
              Pest
            </Link>
            <Link to="/industries/fiber" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary transition-colors hover:text-foreground">
              Fiber
            </Link>
            <Link to="/apply/rookie" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary transition-colors hover:text-foreground">
              Apply
            </Link>
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="public-dots relative overflow-hidden px-5 py-14 sm:px-6 md:py-24">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h1 className="sr-only">Summit — door-to-door sales</h1>
            <Wordmark
              variant="hero"
              height={200}
              className="mx-auto !h-auto w-[86vw] max-w-[680px]"
            />
            <p className="mx-auto mt-7 max-w-xl text-lg text-text-secondary sm:text-xl">{tagline}</p>

            <div className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row">
              <button
                onClick={scrollToEarnings}
                className="flex-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                See what you would make
              </button>
              <Link
                to="/apply/rookie"
                className="flex-1 inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong px-6 text-sm font-bold text-foreground transition-colors hover:border-foreground"
              >
                Apply
              </Link>
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Pest control now · Fiber internet in the off-season
            </p>

            <div className="mt-8">
              <LiveCounters variant="inline" />
            </div>
          </div>
        </section>

        {/* What the work is */}
        <section className="px-5 py-14 sm:px-6 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {WHAT_WE_DO.map((c) => (
              <article key={c.title} className="public-card p-6">
                <c.icon className="mb-4 h-5 w-5 text-text-secondary" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="text-lg font-extrabold text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{c.line}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Calculator */}
        <section id="earnings" className="scroll-mt-20 px-5 py-14 sm:px-6 md:py-24">
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
        <section className="px-5 py-14 sm:px-6 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              How the season works
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {SEASON_STEPS.map((s, i) => (
                <li key={s.title} className="public-card p-6">
                  <span className="block text-2xl font-black tabular-nums text-text-muted">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-extrabold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{s.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final band */}
        <section className="public-dots relative overflow-hidden border-t border-border px-5 py-14 text-center sm:px-6 md:py-24">
          <div className="relative z-10 mx-auto max-w-xl">
            <Wordmark variant="hero" height={110} className="mx-auto !h-auto w-[70vw] max-w-[380px]" />
            <p className="mt-6 text-base text-text-secondary">Applications take a few minutes.</p>
            <Link
              to="/apply/rookie"
              className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Apply
            </Link>
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
    </div>
  );
};

export default Index;
