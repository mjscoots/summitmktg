import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MountainScene, requestTiltPermission } from "@/components/brand/MountainScene";
import ThreeDoorSection from "@/components/recruiting/ThreeDoorSection";
import { ProductionTicker } from "@/components/recruiting/ProductionTicker";
import { COVER_STATS } from "@/lib/coverStats";
import { RidgelineMark } from '@/components/brand/RidgelineMark';
import { usePublicMotion } from '@/hooks/usePublicMotion';
import { useCoverMedia } from '@/hooks/useCoverMedia';
import { AskSheet, AskSection } from '@/components/recruiting/AskSheet';
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
  const [wideInk, setWideInk] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1100);
  const tiltAsked = useRef(false);
  const onWorldLight = useCallback((light: boolean) => setWorldLight(light), []);
  usePublicMotion();

  useEffect(() => {
    const resize = () => setWideInk(window.innerWidth >= 1100);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);


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
      const nextHeroProgress = Math.min(1, Math.max(0, y / Math.max(1, window.innerHeight)));
      setHeroProgress(nextHeroProgress);
      heroRef.current?.style.setProperty('--bridge-opacity', String(Math.min(0.1, Math.max(0, (nextHeroProgress - 0.18) / 0.18 * 0.1))));

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

      <header className={`public-nav fixed inset-x-0 top-0 z-30 ${scrolled ? 'public-nav-scrolled' : ''}`}>
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

      <AskSheet watchId="statement" />

      <main className="relative flex-1">
        {/* Screen one: only the assembled logo in the dark world. */}
        <section ref={heroRef} className="cover-open cover-hero relative isolate px-5 sm:px-6">
          <CoverLogo progress={heroProgress} onWorldLight={onWorldLight} />
          <div className="cover-scroll-cue" data-hidden={heroProgress > 0.04 ? 'true' : 'false'} aria-hidden="true">
            <span />
          </div>
          <div className="min-h-[100svh]" aria-hidden="true" />
        </section>

        {/* Screen two: the statement never shares space with the logo. */}
        <section id="statement" className="cover-statement relative isolate flex min-h-[100svh] items-center px-5 text-center sm:px-6">
          <div className="cover-statement-copy mx-auto w-full max-w-6xl" data-in={worldLight ? 'true' : 'false'}>
            <h1 className="cover-headline">
              <PenLine
                className="cover-ink-headline"
                lines={wideInk ? ['EVERYONE ARGUES OVER WHICH INDUSTRY IS BEST.'] : ['EVERYONE ARGUES OVER', 'WHICH INDUSTRY IS BEST.']}
                duration={1600}
                start={worldLight}
              />
              <span className="reveal-clip cover-block-line"><span className="cover-line-purple block">WE JOINED ALL THREE.</span></span>
            </h1>
            <PenLine
              className="cover-pen mt-6"
              lines={['Trinity.', 'Where being a sales rep is not the end goal.']}
              duration={1400}
              delay={2520}
              start={worldLight}
            />
            <div className="cover-actions mt-9 flex w-full items-center justify-center">
              <Link to="/apply/rookie" onClick={onPrimaryTap} className="btn-purple cover-get-in inline-flex items-center justify-center gap-2 px-8">
                Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <ThreeDoorSection />

        {/* The three questions, in the page for anyone who closed the sheet. */}
        <AskSection />

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
