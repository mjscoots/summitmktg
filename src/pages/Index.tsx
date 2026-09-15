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
  const statementRef = useRef<HTMLElement | null>(null);
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

  // Pass 193: one clock begins when the white swell finishes. It drives both
  // writing masks and every entrance, then stops completely after six seconds.
  useEffect(() => {
    const statement = statementRef.current;
    if (!statement) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setProgress = (name: string, value: number) => statement.style.setProperty(name, value.toFixed(4));
    const reset = () => {
      ['--ink-all', '--ink-1', '--ink-2', '--payoff-1', '--payoff-2', '--note-progress', '--button-progress']
        .forEach((name) => setProgress(name, 0));
      statement.dataset.sequence = 'idle';
      statement.querySelectorAll<HTMLElement>('[data-animating]').forEach((node) => { node.dataset.animating = 'false'; });
    };
    if (reduced) {
      statement.dataset.sequence = 'reduced';
      return;
    }
    if (!worldLight) {
      reset();
      return;
    }

    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const range = (time: number, from: number, to: number) => clamp((time - from) / (to - from));
    const easeOut = (value: number) => 1 - Math.pow(1 - value, 4);
    const nodes = {
      ink: statement.querySelector<HTMLElement>('[data-sequence-part="ink"]'),
      payoffOne: statement.querySelector<HTMLElement>('[data-sequence-part="payoff-1"]'),
      payoffTwo: statement.querySelector<HTMLElement>('[data-sequence-part="payoff-2"]'),
      note: statement.querySelector<HTMLElement>('[data-sequence-part="note"]'),
      button: statement.querySelector<HTMLElement>('[data-sequence-part="button"]'),
    };
    const penLines = Array.from(statement.querySelectorAll<HTMLElement>('.pen-line'));
    const penWidths = penLines.map((line) => line.getBoundingClientRect().width);
    penLines.forEach((line, index) => line.style.setProperty('--pen-width', `${penWidths[index].toFixed(2)}px`));
    const mark = (node: HTMLElement | null, active: boolean) => {
      if (node) node.dataset.animating = active ? 'true' : 'false';
    };
    const startedAt = performance.now();
    const frameCosts: number[] = [];
    const visibleAt: Record<string, number> = {};
    statement.dataset.sequence = 'playing';
    statement.dataset.sequenceStarted = startedAt.toFixed(2);
    let frame = 0;
    const draw = (now: number) => {
      const workStarted = performance.now();
      const time = now - startedAt;
      const ink = range(time, 0, 1400);
      setProgress('--ink-all', ink);
      setProgress('--ink-1', range(time, 0, 700));
      setProgress('--ink-2', range(time, 700, 1400));
      setProgress('--payoff-1', easeOut(range(time, 2400, 2780)));
      setProgress('--payoff-2', easeOut(range(time, 2580, 2960)));
      setProgress('--note-progress', range(time, 3960, 5360));
      setProgress('--button-progress', easeOut(range(time, 5560, 5980)));
      penLines.forEach((line, index) => {
        const progress = index === penLines.length - 1
          ? range(time, 3960, 5360)
          : wideInk
            ? ink
            : index === 0 ? range(time, 0, 700) : range(time, 700, 1400);
        line.style.setProperty('--pen-dot-x', `${(penWidths[index] * progress).toFixed(2)}px`);
      });
      mark(nodes.ink, time < 1400);
      mark(nodes.payoffOne, time >= 2400 && time < 2780);
      mark(nodes.payoffTwo, time >= 2580 && time < 2960);
      mark(nodes.note, time >= 3960 && time < 5360);
      mark(nodes.button, time >= 5560 && time < 5980);
      const recordVisible = (key: string, active: boolean) => {
        if (active && visibleAt[key] === undefined) {
          visibleAt[key] = time;
          statement.dataset[`${key}VisibleAt`] = time.toFixed(1);
        }
      };
      recordVisible('ink', ink > 0);
      recordVisible('payoffOne', time >= 2400);
      recordVisible('payoffTwo', time >= 2580);
      recordVisible('note', time >= 3960);
      recordVisible('button', time >= 5560);
      frameCosts.push(performance.now() - workStarted);
      if (time < 5980) frame = requestAnimationFrame(draw);
      else {
        const ordered = [...frameCosts].sort((a, b) => a - b);
        const percentile = ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))] || 0;
        statement.dataset.frameMedian = (ordered[Math.floor(ordered.length / 2)] || 0).toFixed(3);
        statement.dataset.frameP95 = percentile.toFixed(3);
        statement.dataset.frameMax = (ordered[ordered.length - 1] || 0).toFixed(3);
        statement.dataset.sequenceComplete = 'true';
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [wideInk, worldLight]);

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
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/" aria-label="Trinity home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={28} className="h-7 w-auto" />
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
        <section ref={statementRef} id="statement" className="cover-statement relative isolate px-5 text-center sm:px-6">
          <div className="cover-statement-copy mx-auto w-full max-w-6xl">
            <h1 className="cover-headline">
              <div data-sequence-part="ink" data-animating="false">
                <PenLine
                  className="cover-ink-headline"
                  lines={wideInk ? ['Everyone argues over which industry is best.'] : ['Everyone argues over', 'which industry is best.']}
                  progressVariables={wideInk ? ['--ink-all'] : ['--ink-1', '--ink-2']}
                />
              </div>
              <span className="reveal-clip cover-block-line">
                <span className="cover-block-lines">
                  <span className="cover-line-black" data-sequence-part="payoff-1" data-animating="false">SO WE JOINED</span>
                  <span className="cover-line-blue" data-sequence-part="payoff-2" data-animating="false">ALL THREE.</span>
                </span>
              </span>
            </h1>
            <div data-sequence-part="note" data-animating="false">
              <PenLine
                className="cover-pen"
                lines={['Where being a sales rep is not the end goal.']}
                progressVariables={['--note-progress']}
              />
            </div>
            <div className="cover-actions flex w-full items-center justify-center" data-sequence-part="button" data-animating="false">
              <span className="cover-get-in-wrap">
                <span className="cover-get-in-glow cover-get-in-glow-wide" aria-hidden="true" />
                <span className="cover-get-in-glow cover-get-in-glow-tight" aria-hidden="true" />
                <Link to="/apply/rookie" onClick={onPrimaryTap} className="btn-purple cover-get-in relative inline-flex items-center justify-center gap-2">
                  Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </span>
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
