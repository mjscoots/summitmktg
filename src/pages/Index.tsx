import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowDown, ArrowRight, DoorOpen, Handshake, Wallet } from "lucide-react";
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
 * Pass 178 puts the living canvas range behind the whole page: the sky lifts
 * from night to dawn as the person scrolls, the sections ride over it on their
 * own near opaque surfaces, and the type runs at editorial scale.
 */
const Index = () => {
  const navigate = useNavigate();
  const calc = usePublicCalc();
  const media = useCoverMedia();
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [day, setDay] = useState(0.35);
  const [active, setActive] = useState('work');
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  usePublicMotion();

  const hasPublishedBands = Boolean(calc?.pay_scale?.bands?.length);

  // The sky scalar follows scroll: 0.35 at the hero, 1 at the bottom.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.getElementById('root');
    const target: HTMLElement | Window = el || window;
    const onScroll = () => {
      const y = el ? el.scrollTop : window.scrollY;
      const total = el
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;
      setScrolled(y > 40);
      setPastHero(y > window.innerHeight * 0.7);
      setDay(reduceMotion ? 0.35 : 0.35 + progress * 0.65);
    };
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  // Which section the reader is in, for the sticky section nav underline.
  useEffect(() => {
    const ids = ['work', 'earnings', 'season', 'apply'];
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (seen?.target.id) setActive(seen.target.id);
      },
      { threshold: [0.25, 0.5] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [hasPublishedBands]);

  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const button = bar.querySelector<HTMLElement>(`[data-section='${active}']`);
    if (!button) return;
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
  }, [active, pastHero, hasPublishedBands]);

  const jump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const sections = [
    { id: 'work', label: 'The work' },
    ...(hasPublishedBands ? [{ id: 'earnings', label: 'Earnings' }] : []),
    { id: 'season', label: 'The season' },
    { id: 'apply', label: 'Apply' },
  ];

  return (
    <div className="gold-world public-world relative flex min-h-screen flex-col">
      {/* The living range sits fixed behind the whole cover. */}
      <div className="cover-scene" aria-hidden="true">
        {media.video ? (
          <video className="cover-media" src={media.video} autoPlay muted loop playsInline />
        ) : media.image ? (
          <img className="cover-media" src={media.image} alt="" />
        ) : null}
        {(media.video || media.image) && <div className="cover-scrim" />}
        <MountainScene day={day} pointerParallax />
      </div>

      <header className={`public-nav sticky top-0 z-30 ${scrolled ? 'public-nav-scrolled' : ''}`}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" aria-label="Trinity home" className="wordmark-sweep flex min-h-11 items-center">
            <Wordmark variant="compact" height={26} />
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Link to="/industries/pest" className="public-link inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary sm:px-3">
              Pest
            </Link>
            <Link to="/industries/fiber" className="public-link inline-flex min-h-11 items-center px-2.5 text-sm text-text-secondary sm:px-3">
              Fiber
            </Link>
            <Link to="/login" className="public-link inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ice">
              Sign in
            </Link>
          </div>
        </nav>
        {pastHero && (
          <div className="section-nav" ref={navRef}>
            <div className="mx-auto flex max-w-6xl items-center gap-1 px-5 sm:px-6">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  data-section={section.id}
                  onClick={() => jump(section.id)}
                  className={`inline-flex min-h-11 items-center px-3 text-sm ${active === section.id ? 'text-foreground' : 'text-text-secondary'}`}
                >
                  {section.label}
                </button>
              ))}
              {indicator && (
                <span
                  className="section-nav-underline"
                  style={{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }}
                />
              )}
            </div>
          </div>
        )}
      </header>

      <main className="relative flex-1">
        {/* Hero: full viewport, lockup top left, headline in the lower third. */}
        <section className="public-cover relative isolate px-5 sm:px-6">
          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-69px)] max-w-6xl flex-col justify-between pb-16 pt-10 sm:pb-20 md:pb-24">
            <Wordmark variant="hero" height={72} animate />
            <div>
              <div className="max-w-4xl">
                <h1 className="cover-headline font-display font-bold text-foreground">
                  <span className="cover-headline-line">Financial freedom.</span>
                  <span className="cover-headline-line">Done differently.</span>
                </h1>
                {COVER_STATS && <PublicProofStrip />}
                <p className="cover-support mt-6 max-w-[60ch] text-base leading-relaxed text-text-secondary sm:text-lg">
                  A performance-based path through sales, training, and team leadership.
                </p>
              </div>

              {/* Space for both actions is reserved so the late pay scale read
                  cannot shift the hero. */}
              <div className="cover-actions mt-9 flex min-h-[112px] w-full max-w-xl flex-col items-start gap-4 sm:min-h-12 sm:flex-row sm:items-center">
                <Button asChild className="primary-sheen magnetic min-h-12 w-full overflow-hidden px-8 font-bold sm:w-auto">
                  <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </Button>
                {hasPublishedBands && (
                  <button
                    type="button"
                    onClick={() => jump('earnings')}
                    className="public-link inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold text-ice"
                  >
                    See what you could make <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <p className="mt-5 text-sm text-text-muted">
                Pest control now · Fiber internet in the off-season
              </p>
            </div>
          </div>
        </section>

        <ThreeDoorSection />

        {/* What the work is */}
        <section id="work" className="public-section public-reveal px-5 py-16 sm:px-6 md:py-24" data-reveal>
          <h2 className="sr-only">What the work is</h2>
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3 md:gap-12">
            {WHAT_WE_DO.map((c, index) => (
              <article key={c.title} className="public-process card-spotlight">
                <div className="mb-5 flex items-center justify-between">
                  <c.icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xs tabular-nums text-text-muted">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                <p className="mt-2 max-w-[60ch] text-sm text-text-secondary">{c.line}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Calculator, still gated on a published pay scale */}
        {hasPublishedBands && (
          <section id="earnings" className="public-section public-reveal scroll-mt-20 px-5 py-16 sm:px-6 md:py-24" data-reveal>
            <div className="mx-auto max-w-3xl">
              <h2 className="section-title text-center font-display font-bold tracking-tight text-foreground">
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
        <section id="season" className="public-section public-reveal px-5 py-16 sm:px-6 md:py-24" data-reveal>
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title font-display font-bold tracking-tight text-foreground">
              How the season works
            </h2>
            <ol className="mt-10">
              {SEASON_STEPS.map((s, i) => (
                <li key={s.title} className="card-spotlight grid gap-2 py-6 sm:grid-cols-[3rem_10rem_1fr] sm:items-baseline sm:gap-5">
                  <span className="text-xs tabular-nums text-primary">0{i + 1}</span>
                  <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="max-w-[60ch] text-sm text-text-secondary">{s.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final band */}
        <section id="apply" className="public-cta public-section public-reveal relative px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <div className="relative z-10 mx-auto max-w-xl">
            <Wordmark variant="hero" height={96} className="mx-auto" />
            <p className="mt-6 text-base text-text-secondary">Applications take a few minutes.</p>
            <Button asChild className="magnetic mt-7 min-h-12 px-8 font-bold">
              <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
            <p className="mt-8 text-sm text-text-secondary">
              Already on the team,{' '}
              <Link to="/login" className="public-link inline-flex min-h-11 items-center font-semibold text-ice">
                sign in
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="footer-signature public-section public-reveal py-8" data-reveal>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <RidgelineMark size={26} animate={false} />
            <div>
              <p className="text-sm font-semibold text-foreground">Trinity Sales</p>
              <p className="text-xs text-text-muted">© 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/parents" className="public-link inline-flex min-h-11 items-center px-3 text-sm text-text-secondary">
              For parents
            </Link>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="public-link inline-flex min-h-11 items-center px-3 text-sm text-text-secondary"
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
