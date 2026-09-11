import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, DoorOpen, Handshake, Wallet } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MountainScene } from "@/components/brand/MountainScene";
import { PublicProofStrip } from "@/components/recruiting/LiveCounters";
import ThreeDoorSection from "@/components/recruiting/ThreeDoorSection";
import { ProductionTicker } from "@/components/recruiting/ProductionTicker";
import { usePublicCalc } from "@/hooks/usePublicCalc";
import { Button } from "@/components/ui/button";
import { COVER_STATS } from "@/lib/coverStats";
import { RidgelineMark } from '@/components/brand/RidgelineMark';
import { usePublicMotion } from '@/hooks/usePublicMotion';
import { useCoverMedia } from '@/hooks/useCoverMedia';
import { FindYourDoor } from '@/components/recruiting/FindYourDoor';
import { ReferralLookup } from '@/components/recruiting/ReferralLookup';
import { WhoRunsIt } from '@/components/recruiting/WhoRunsIt';
import { LogoBurst, shouldRunIntro } from '@/components/brand/LogoBurst';

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));

const WHAT_WE_DO = [
  { icon: DoorOpen, title: "Knock", line: "You work a set area with a script you have practised." },
  { icon: Handshake, title: "Close", line: "You sign the account at the door and log it the same day." },
  { icon: Wallet, title: "Get paid", line: "You are paid on what you close, not on hours." },
];

const SEASON_STEPS = [
  { word: 'Apply', line: 'A short form, then a call with a manager.' },
  { word: 'Train', line: 'Scripts, product and practice before you knock.' },
  { word: 'Sell', line: 'You work an area with your team through the summer.' },
  { word: 'Settle up', line: 'Your pay follows the scale you reached.' },
  { word: 'Roll into fiber', line: 'When pest ends, fiber starts. Same team, new product, no gap.' },
];

const PAY_LINES = [
  'You are paid commission on the accounts you sell.',
  'Pay is settled on serviced accounts.',
  'Three tiers: Rookie, Experienced, Veteran.',
  'Housing is charged per night at what the room actually costs.',
];

/**
 * Public front door for Trinity Sales.
 *
 * Pass 181 centres the whole cover, cuts the interaction back to the opening and
 * the qualifier, and puts the range behind the hero and the final band only.
 * There is no sticky section, no scroll snap and one rAF scroll loop.
 */
const Index = () => {
  const navigate = useNavigate();
  const calc = usePublicCalc();
  const media = useCoverMedia();
  const [scrolled, setScrolled] = useState(false);
  const [sceneOn, setSceneOn] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLElement | null>(null);
  // The opening runs once per session and only with motion allowed.
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const [intro] = useState(() => shouldRunIntro());
  const [headlineVisible, setHeadlineVisible] = useState(true);
  const [settled, setSettled] = useState(() => !intro);
  // Scroll progress over the first 60vh, which drives the headline sweep.
  const [heroProgress, setHeroProgress] = useState(0);
  const onHeadlineVisible = useCallback((visible: boolean) => setHeadlineVisible(visible), []);
  const onSettled = useCallback(() => setSettled(true), []);
  usePublicMotion();

  const hasPublishedBands = Boolean(calc?.pay_scale?.bands?.length);

  // One passive scroll listener, one rAF, two reads: how far down the page we
  // are and how far through the first 60vh.
  useEffect(() => {
    const el = document.getElementById('root');
    const target: HTMLElement | Window = el || window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = el ? el.scrollTop : window.scrollY;
      setScrolled(y > 40);
      setHeroProgress(Math.min(1, Math.max(0, y / (window.innerHeight * 0.6))));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };
    read();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The canvas only runs while the hero or the final band is on screen.
  useEffect(() => {
    const nodes = [heroRef.current, bandRef.current].filter((n): n is HTMLElement => Boolean(n));
    if (nodes.length === 0) return;
    const seen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) seen.add(entry.target);
        else seen.delete(entry.target);
      });
      setSceneOn(seen.size > 0);
    });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [hasPublishedBands]);

  return (
    <div className="gold-world public-world relative flex min-h-screen flex-col">
      {/* The range sits fixed behind the hero and the final band. */}
      <div className="cover-scene" aria-hidden="true">
        {media.video ? (
          <video className="cover-media" src={media.video} autoPlay muted loop playsInline />
        ) : media.image ? (
          <img className="cover-media" src={media.image} alt="" />
        ) : null}
        {(media.video || media.image) && <div className="cover-scrim" />}
        {sceneOn && <MountainScene pointerParallax />}
      </div>

      <header className={`public-nav sticky top-0 z-30 ${scrolled ? 'public-nav-scrolled' : ''}`}>
        <nav className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-3 sm:flex-row sm:justify-between sm:px-6">
          <Link to="/" aria-label="Trinity home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={24} />
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Link to="/industries/pest" className="inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary sm:px-3">
              Pest
            </Link>
            <Link to="/industries/fiber" className="inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary sm:px-3">
              Fiber
            </Link>
            <Link to="/login" className="public-link inline-flex min-h-11 items-center px-3 text-sm font-semibold">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative flex-1">
        {/* Hero: centred in the viewport, nothing off to the left. */}
        <section
          ref={heroRef}
          className={`cover-open relative isolate px-5 sm:px-6${intro ? ' cover-opening' : ''}`}
        >
          {intro && (
            <LogoBurst
              headlineRef={headlineRef}
              progress={heroProgress}
              onHeadlineVisible={onHeadlineVisible}
              onSettled={onSettled}
            />
          )}
          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center py-20 text-center">
            <h1
              ref={headlineRef}
              className="cover-headline text-foreground"
              data-hidden={!headlineVisible}
              data-fade="true"
              style={intro ? undefined : { opacity: Math.max(0, 1 - heroProgress * heroProgress) }}
            >
              <span className="block">EVERY SUMMER SALES JOB ENDS IN AUGUST.</span>
              <span className="gradient-text block">EXCEPT THIS ONE.</span>
            </h1>

            <p
              data-opening-hidden={intro && !settled ? 'true' : undefined}
              className="cover-support cover-measure mt-6 text-base leading-relaxed text-text-secondary sm:text-lg"
            >
              Pest control in season. Fiber internet after it. One team, selling all year.
            </p>

            <div
              data-opening-hidden={intro && !settled ? 'true' : undefined}
              className="cover-actions mt-9 flex w-full max-w-sm flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link to="/apply/rookie" className="btn-gradient inline-flex w-full items-center justify-center gap-2 px-8 sm:w-auto">
                Apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/login" className="public-link inline-flex min-h-12 items-center px-3 text-sm font-semibold">
                Sign in
              </Link>
            </div>

            {COVER_STATS && (
              <div data-opening-hidden={intro && !settled ? 'true' : undefined} className="mt-10 w-full">
                <PublicProofStrip />
              </div>
            )}
          </div>
        </section>

        <ThreeDoorSection />

        {/* Find your door: three taps to the right application */}
        <section id="find" className="public-section public-reveal px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <h2 className="section-title mx-auto max-w-4xl text-foreground">Find your door</h2>
          <div className="mt-10">
            <FindYourDoor />
          </div>
        </section>

        {/* What the work is */}
        <section id="work" className="public-section public-reveal px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <h2 className="sr-only">What the work is</h2>
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3 md:gap-12">
            {WHAT_WE_DO.map((c, index) => (
              <article key={c.title} className="public-process">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <c.icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xs tabular-nums text-text-muted">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                <p className="cover-measure mt-2 text-sm text-text-secondary">{c.line}</p>
              </article>
            ))}
          </div>
        </section>

        <WhoRunsIt />

        {/* How pay is set. The calculator lives here and turns on when a pay
            scale is published. */}
        <section id="earnings" className="public-section public-reveal scroll-mt-20 px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <div className="mx-auto max-w-3xl">
            <h2 className="section-title text-foreground">
              {hasPublishedBands ? 'Estimate your earnings' : 'How pay is set'}
            </h2>
            {hasPublishedBands ? (
              <>
                <p className="mt-2 text-sm text-text-secondary">
                  Set the accounts and the weeks. The pay scale does the rest.
                </p>
                <div className="mt-8 text-left">
                  <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                    <EarningsCalculator calcData={calc} onApplyClick={() => navigate('/apply/rookie')} />
                  </Suspense>
                </div>
              </>
            ) : (
              <>
                <div className="cover-measure mt-8 space-y-3">
                  {PAY_LINES.map((line) => (
                    <p key={line} className="text-base text-text-secondary">{line}</p>
                  ))}
                </div>
                <p className="mt-8 text-sm text-text-muted">
                  The full pay scale is published here when it is released.
                </p>
              </>
            )}
          </div>
        </section>

        {/* How the season works: five plain steps */}
        <section id="season" className="public-section public-reveal px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title text-foreground">How the season works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              {SEASON_STEPS.map((step, index) => (
                <li key={step.word}>
                  <p className="cover-label text-text-muted">0{index + 1}</p>
                  <p className="mt-2 text-xl font-extrabold tracking-tight text-foreground">{step.word}</p>
                  <p className="cover-measure mt-2 text-sm text-text-secondary">{step.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final band */}
        <section
          ref={bandRef}
          id="apply"
          className="cover-open public-reveal relative px-5 py-16 text-center sm:px-6 md:py-24"
          data-reveal
        >
          <div className="relative z-10 mx-auto max-w-xl">
            <p className="text-base text-text-secondary">Applications take a few minutes.</p>
            <Link to="/apply/rookie" className="btn-gradient mt-7 inline-flex items-center justify-center gap-2 px-8">
              Apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <ReferralLookup />
            <p className="mt-8 text-sm text-text-secondary">
              Already on the team,{' '}
              <Link to="/login" className="public-link inline-flex min-h-11 items-center font-semibold">
                sign in
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="footer-signature public-section public-reveal py-8" data-reveal>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <RidgelineMark size={20} animate={false} />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Trinity Sales</p>
              <p className="text-xs text-text-muted">2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/parents" className="inline-flex min-h-11 items-center px-3 text-sm text-text-secondary">
              For parents
            </Link>
            <a
              href="https://www.instagram.com/trntyhq"
              target="_blank"
              rel="noopener noreferrer"
              className="public-link inline-flex min-h-11 items-center px-3 text-sm"
            >
              @trntyhq
            </a>
          </div>
        </div>
      </footer>
      {COVER_STATS && <ProductionTicker />}
    </div>
  );
};

export default Index;
