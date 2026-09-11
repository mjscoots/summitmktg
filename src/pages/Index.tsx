import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MountainScene, requestTiltPermission } from "@/components/brand/MountainScene";
import { PublicProofStrip } from "@/components/recruiting/LiveCounters";
import ThreeDoorSection from "@/components/recruiting/ThreeDoorSection";
import { ProductionTicker } from "@/components/recruiting/ProductionTicker";
import { CoverTicker } from "@/components/recruiting/CoverTicker";
import { COVER_STATS } from "@/lib/coverStats";
import { RidgelineMark } from '@/components/brand/RidgelineMark';
import { usePublicMotion } from '@/hooks/usePublicMotion';
import { useCoverMedia } from '@/hooks/useCoverMedia';
import { FindYourDoor } from '@/components/recruiting/FindYourDoor';
import { ReferralLookup } from '@/components/recruiting/ReferralLookup';
import { CoverLogo } from '@/components/brand/CoverLogo';
import { PenLine } from '@/components/brand/PenLine';


/**
 * Public front door for Trinity Sales.
 *
 * Pass 184 puts the logo dead centre. It builds itself out of flying chunks on
 * load, fills with the gradient as the visitor scrolls, and at 55 percent of the
 * first viewport it bursts and the whole cover swells from black to white. One
 * rAF loop reads the scroll and writes four things: whether the nav is scrolled,
 * the hero progress that drives the logo, the progress hairline, and the final
 * band's own progress, which lifts the scene glow. Everything below the hero is
 * the light world and stays plain.
 */
const Index = () => {
  const media = useCoverMedia();
  const [scrolled, setScrolled] = useState(false);
  const [sceneOn, setSceneOn] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  // True once the white has covered the screen, false again on the way back.
  const [worldLight, setWorldLight] = useState(false);
  // Scroll progress over the first viewport, which drives the logo.
  const [heroProgress, setHeroProgress] = useState(0);
  // The final band's own progress, which lifts the scene glow.
  const [bandProgress, setBandProgress] = useState(0);
  const tiltAsked = useRef(false);
  const onWorldLight = useCallback((light: boolean) => setWorldLight(light), []);
  usePublicMotion();


  // iOS only hands over device orientation from inside a gesture, and the grant
  // does not survive the session. It is asked for once, on the first tap of the
  // primary button; a refusal simply leaves the scene's own drift running.
  const onPrimaryTap = useCallback(() => {
    if (tiltAsked.current) return;
    tiltAsked.current = true;
    void requestTiltPermission();
  }, []);

  // One passive scroll listener, one rAF, and the reads the whole cover needs.
  useEffect(() => {
    const el = document.getElementById('root');
    const target: HTMLElement | Window = el || window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = el ? el.scrollTop : window.scrollY;
      setScrolled(y > 40);
      setHeroProgress(Math.min(1, Math.max(0, y / Math.max(1, window.innerHeight))));

      const scroller = el || document.documentElement;
      const span = Math.max(1, scroller.scrollHeight - window.innerHeight);
      progressRef.current?.style.setProperty('--cover-progress', String(Math.min(1, y / span)));

      const band = bandRef.current;
      if (band) {
        const rect = band.getBoundingClientRect();
        const travel = Math.max(1, window.innerHeight + rect.height);
        setBandProgress(Math.min(1, Math.max(0, (window.innerHeight - rect.top) / travel)));
      }
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
  }, []);

  return (
    <div
      className="gold-world public-world relative flex min-h-screen flex-col"
      data-world={worldLight ? 'light' : 'dark'}
    >
      {/* The range sits fixed behind the hero and the final band. */}
      <div className="cover-scene" aria-hidden="true">
        {media.video ? (
          <video className="cover-media" src={media.video} autoPlay muted loop playsInline />
        ) : media.image ? (
          <img className="cover-media" src={media.image} alt="" />
        ) : null}
        {(media.video || media.image) && <div className="cover-scrim" />}
        {sceneOn && <MountainScene pointerParallax glowBoost={bandProgress} light={worldLight} />}
      </div>

      <div className="cover-progress" ref={progressRef} aria-hidden="true" />

      <header className={`public-nav sticky top-0 z-30 ${scrolled ? 'public-nav-scrolled' : ''}`}>
        <nav className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-3 sm:flex-row sm:justify-between sm:px-6">
          <Link to="/" aria-label="Trinity home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={34} className="h-7 w-auto sm:h-[34px]" />
          </Link>
          <div className="flex items-center">
            <Link to="/login" className="public-link inline-flex min-h-11 items-center px-3 text-sm font-semibold">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative flex-1">
        {/* Screen one: only the assembled logo in the dark world. */}
        <section ref={heroRef} className="cover-open relative isolate px-5 sm:px-6">
          <CoverLogo progress={heroProgress} onWorldLight={onWorldLight} />
          <div className="min-h-[100svh]" aria-hidden="true" />
        </section>

        {/* Screen two: the statement never shares space with the logo. */}
        <section className="cover-statement public-section relative isolate flex min-h-[100svh] items-center px-5 py-20 text-center sm:px-6">
          <div className="cover-statement-copy mx-auto w-full max-w-6xl" data-in={worldLight ? 'true' : 'false'}>
            <h1 className="cover-headline">
              <span className="reveal-clip"><span className="cover-line-blue block">EVERYONE ARGUES OVER WHICH INDUSTRY IS BEST.</span></span>
              <span className="reveal-clip"><span className="cover-line-purple block">WE JOINED ALL THREE.</span></span>
            </h1>
            <p className="cover-statement-body mx-auto mt-7 max-w-[60ch] text-foreground">
              Pest control. Fiber internet. Life insurance. One team. Sell any of them, year round, and find the one that fits you.
            </p>
            <PenLine className="cover-pen mt-6" start={worldLight} />
            <div className="cover-actions mt-9 flex w-full max-w-sm flex-col items-center gap-4 sm:mx-auto sm:flex-row sm:justify-center">
              <Link to="/apply/rookie" onClick={onPrimaryTap} className="btn-purple inline-flex w-full items-center justify-center gap-2 px-8 sm:w-auto">
                Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/login" className="public-link inline-flex min-h-12 items-center px-3 text-sm font-semibold">Sign in</Link>
            </div>
          </div>
        </section>

        {/* The ticker band: offices, live counters and three industries. */}
        <CoverTicker />

        {COVER_STATS && (
          <div className="public-section px-5 py-10 sm:px-6" data-reveal>
            <div className="mx-auto max-w-4xl">
              <PublicProofStrip />
            </div>
          </div>
        )}

        <ThreeDoorSection />

        {/* Find your door: three taps to the right application */}
        <section id="find" className="public-section px-5 py-16 text-center sm:px-6 md:py-24" data-reveal>
          <h2 className="section-title mx-auto max-w-4xl text-foreground">
            <span className="reveal-clip"><span>Find your door</span></span>
          </h2>
          <div className="mt-10">
            <FindYourDoor />
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
            <Link
              to="/apply/rookie"
              onClick={onPrimaryTap}
              className="btn-purple mt-7 inline-flex items-center justify-center gap-2 px-8"
            >
              Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
