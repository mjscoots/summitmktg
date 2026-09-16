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
  const stageRef = useRef<HTMLElement | null>(null);
  const statementRef = useRef<HTMLElement | null>(null);

  const bandRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  // True once the white has covered the screen, false again on the way back.
  const [worldLight, setWorldLight] = useState(false);
  // Scroll progress over the first viewport, which drives the logo.
  const [heroProgress, setHeroProgress] = useState(0);
  // The final band's own progress, which lifts the scene glow.
  const [bandProgress, setBandProgress] = useState(0);
  const worldLightRef = useRef(false);
  const remeasureStatementRef = useRef<() => void>(() => undefined);
  const tiltAsked = useRef(false);
  const onWorldLight = useCallback((light: boolean) => setWorldLight(light), []);
  const onBurst = useCallback(() => undefined, []);
  usePublicMotion();

  useEffect(() => {
    const resize = () => {
      requestAnimationFrame(() => remeasureStatementRef.current());
    };
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
      // s is progress through the pinned stage, so the logo and burst read
      // from the same travel.
      const stage = stageRef.current;
      let nextHeroProgress = 0;
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const travel = Math.max(1, rect.height - window.innerHeight);
        nextHeroProgress = Math.min(1, Math.max(0, -rect.top / travel));
        stage.dataset.stageProgress = nextHeroProgress.toFixed(4);
      }
      setHeroProgress(nextHeroProgress);
      stage?.style.setProperty('--bridge-opacity', String(Math.min(0.1, Math.max(0, (nextHeroProgress - 0.18) / 0.16 * 0.1))));


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

  // One guarded clock begins the first time the statement is 45 percent visible.
  // Font and layout measurement stay outside the animation loop.
  useEffect(() => {
    const statement = statementRef.current;
    if (!statement) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setProgress = (name: string, value: number) => statement.style.setProperty(name, value.toFixed(4));
    let frame = 0;
    let measurementFrame = 0;
    let started = false;
    let visible = false;
    let fontsReady = false;
    let penLines: HTMLElement[] = [];
    let penWidths: number[] = [];
    let cancelled = false;
    if (reduced) {
      ['--type-1', '--type-2', '--shatter-progress', '--brand-progress', '--brand-scale', '--bold-progress', '--button-progress']
        .forEach((name) => setProgress(name, 1));
      statement.dataset.sequence = 'done';
      statement.dataset.phase = 'final';
      statement.dataset.latched = 'true';
      statement.dataset.sequenceComplete = 'true';
      return;
    }

    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const range = (time: number, from: number, to: number) => clamp((time - from) / (to - from));
    const easeOut = (value: number) => 1 - Math.pow(1 - value, 4);
    const nodes = {
      typing: statement.querySelector<HTMLElement>('[data-sequence-part="typing"]'),
      brand: statement.querySelector<HTMLElement>('[data-sequence-part="brand"]'),
      bold: statement.querySelector<HTMLElement>('[data-sequence-part="bold"]'),
      button: statement.querySelector<HTMLElement>('[data-sequence-part="button"]'),
    };
    const measure = () => {
      penLines = Array.from(statement.querySelectorAll<HTMLElement>('.pen-line'));
      penWidths = penLines.map((line) => line.getBoundingClientRect().width);
      penLines.forEach((line, index) => {
        line.style.setProperty('--pen-width', `${penWidths[index].toFixed(2)}px`);
        line.dataset.penMeasured = 'true';
      });
      statement.dataset.penMeasured = 'true';
    };
    const mark = (node: HTMLElement | null, active: boolean) => {
      if (node) node.dataset.animating = active ? 'true' : 'false';
    };
    const start = () => {
      if (started || !visible || !fontsReady || penWidths.length === 0) return;
      started = true;
      const startedAt = performance.now();
      const frameCosts: number[] = [];
      const visibleAt: Record<string, number> = {};
      statement.dataset.sequence = 'playing';
      statement.dataset.latched = 'true';
      statement.dataset.sequenceStarts = String(Number(statement.dataset.sequenceStarts || '0') + 1);
      statement.dataset.sequenceStarted = startedAt.toFixed(2);
      statement.dataset.lineOneWindow = '0-950';
      statement.dataset.lineTwoWindow = '1150-2000';
      statement.dataset.slamAt = '3000';
      statement.dataset.boldAt = '3300';
      statement.dataset.buttonAt = '3600';
      statement.dataset.sequenceEnd = '4000';
      penLines.forEach((line) => line.style.setProperty('--pen-opacity', '1'));
      mark(nodes.typing, true);
      const draw = (now: number) => {
        const workStarted = performance.now();
        const time = now - startedAt;
        setProgress('--type-1', range(time, 0, 950));
        setProgress('--type-2', range(time, 1150, 2000));
        setProgress('--shatter-progress', easeOut(range(time, 3000, 3220)));
        const brandProgress = easeOut(range(time, 3000, 3260));
        const brandScale = time < 3180
          ? 1.3 - easeOut(range(time, 3000, 3180)) * 0.32
          : 0.98 + easeOut(range(time, 3180, 3260)) * 0.02;
        setProgress('--brand-progress', brandProgress);
        setProgress('--brand-scale', brandScale);
        setProgress('--bold-progress', easeOut(range(time, 3300, 3560)));
        setProgress('--button-progress', easeOut(range(time, 3600, 3900)));
        if (time >= 3000 && statement.dataset.phase !== 'final') {
          statement.dataset.phase = 'final';
          statement.setAttribute('data-impact', 'true');
        }
        mark(nodes.typing, time < 3220);
        mark(nodes.brand, time >= 3000 && time < 3260);
        mark(nodes.bold, time >= 3300 && time < 3560);
        mark(nodes.button, time >= 3600 && time < 3900);
        const recordVisible = (key: string, active: boolean) => {
          if (active && visibleAt[key] === undefined) {
            visibleAt[key] = time;
            statement.dataset[`${key}VisibleAt`] = time.toFixed(1);
          }
        };
        recordVisible('typingOne', time > 0);
        recordVisible('typingTwo', time >= 1150);
        recordVisible('brand', time >= 3000);
        recordVisible('bold', time >= 3300);
        recordVisible('button', time >= 3600);
        frameCosts.push(performance.now() - workStarted);
        if (time < 4000) frame = requestAnimationFrame(draw);
        else {
          ['--type-1', '--type-2', '--shatter-progress', '--brand-progress', '--brand-scale', '--bold-progress', '--button-progress']
            .forEach((name) => setProgress(name, 1));
          const ordered = [...frameCosts].sort((a, b) => a - b);
          const percentile = ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))] || 0;
          statement.dataset.frameMedian = (ordered[Math.floor(ordered.length / 2)] || 0).toFixed(3);
          statement.dataset.frameP95 = percentile.toFixed(3);
          statement.dataset.frameMax = (ordered[ordered.length - 1] || 0).toFixed(3);
          statement.dataset.sequenceComplete = 'true';
          statement.dataset.sequence = 'done';
          window.dispatchEvent(new CustomEvent('trnty:statement-complete'));
        }
      };
      frame = requestAnimationFrame(draw);
    };
    remeasureStatementRef.current = measure;
    statement.dataset.sequence = 'idle';
    statement.dataset.phase = 'typing';
    statement.querySelectorAll<HTMLElement>('.pen-line').forEach((line) => line.style.setProperty('--pen-opacity', '0'));
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45);
      if (visible) start();
    }, { threshold: [0.45] });
    observer.observe(statement);
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      measurementFrame = requestAnimationFrame(() => {
        measure();
        fontsReady = true;
        start();
      });
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measurementFrame);
    };
  }, []);

  useEffect(() => {
    worldLightRef.current = worldLight;
  }, [worldLight]);

  return (
    <div
      className="gold-world public-world relative flex min-h-screen flex-col"
      data-world={worldLight ? 'light' : 'dark'}
    >
      {/* The fixed range stays alive from the hero through every public section. */}
      <div className="cover-scene" aria-hidden="true">
        {media.video ? (
          <video className="cover-media" src={media.video} autoPlay muted loop playsInline />
        ) : media.image ? (
          <img className="cover-media" src={media.image} alt="" />
        ) : null}
        {(media.video || media.image) && <div className="cover-scrim" />}
        <MountainScene pointerParallax glowBoost={bandProgress} light={worldLight} />
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

      <AskSheet watchId="cover-stage" completionId="statement" />

      <main className="relative flex-1">
        {/* The pinned stage owns only the logo assembly, burst and white swell. */}
        <section ref={stageRef} id="cover-stage" className="cover-stage relative isolate">
          <div className="cover-stage-pin cover-open cover-hero relative isolate px-5 sm:px-6">
            <CoverLogo progress={heroProgress} onBurst={onBurst} onWorldLight={onWorldLight} />
            <div className="cover-scroll-cue" data-hidden={heroProgress > 0.04 ? 'true' : 'false'} aria-hidden="true">
              <span className="cover-scroll-label">Scroll</span>
              <span className="cover-scroll-track"><span className="cover-scroll-bead" /></span>
              <span className="cover-scroll-chevron" />
            </div>

          </div>
        </section>

        <section ref={statementRef} id="statement" className="cover-statement px-5 text-center sm:px-6">
          <div className="cover-statement-copy mx-auto w-full max-w-6xl">
                <div className="cover-typing-phase" data-copy-block="typing" data-sequence-part="typing" data-animating="false">
                  <PenLine
                    className="cover-typed-lines"
                    lines={['Everyone argues over which industry is best.', 'So we joined ALL THREE.']}
                    progressVariables={['--type-1', '--type-2']}
                    windowDurations={[950, 850]}
                    shatterVariable="--shatter-progress"
                  />
                </div>
                <div className="cover-final-phase">
                  <h1 className="cover-brand-slam" data-copy-block="brand" data-sequence-part="brand" data-animating="false">
                    <span className="cover-brand-impact"><span>TRINITY</span> <span>MARKETING</span></span>
                  </h1>
                  <p className="cover-bold-line" data-copy-block="bold" data-sequence-part="bold" data-animating="false">
                    <span>Where being a sales rep is not the end goal.</span>
                  </p>
                  <div className="cover-actions flex w-full items-center justify-center" data-copy-block="button" data-sequence-part="button" data-animating="false">
                    <span className="cover-get-in-wrap">
                      <span className="cover-get-in-glow cover-get-in-glow-wide" aria-hidden="true" />
                      <span className="cover-get-in-glow cover-get-in-glow-tight" aria-hidden="true" />
                      <Link to="/apply/rookie" onClick={onPrimaryTap} className="btn-purple cover-get-in relative inline-flex items-center justify-center gap-2">
                        Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </span>
                  </div>
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
