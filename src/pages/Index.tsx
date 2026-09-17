import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
import { RIDGES } from '@/components/brand/MountainRange';
import { ProofHeadline, ProofSet } from '@/components/recruiting/ProofLines';


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
  const tiltAsked = useRef(false);
  const onWorldLight = useCallback((light: boolean) => setWorldLight(light), []);
  const onBurst = useCallback(() => undefined, []);
  usePublicMotion();

  // Pass 222 - the static first screen from index.html is dropped the moment
  // this cover has mounted, before the browser paints, so the two are never on
  // screen together. A failed mount leaves it in place with its link working.
  useLayoutEffect(() => {
    document.getElementById('boot-cover')?.remove();
  }, []);

  // Pass 223 - iOS only hands over device orientation from inside a gesture,
  // but it must never be the apply tap: the native dialog used to open at the
  // same instant the route changed. It is now asked for once on the first
  // gesture that is not a link or a button, and never on the way to applying.
  // A refusal simply leaves the scene's own drift running.
  useEffect(() => {
    const ask = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button, input, textarea, select, [role="button"]')) return;
      if (tiltAsked.current) return;
      tiltAsked.current = true;
      document.removeEventListener('pointerdown', ask);
      void requestTiltPermission();
    };
    document.addEventListener('pointerdown', ask, { passive: true });
    return () => document.removeEventListener('pointerdown', ask);
  }, []);

  // One passive scroll listener, one rAF, and the reads the whole cover needs.
  useEffect(() => {
    const el = document.getElementById('root');
    const target: HTMLElement | Window = el || window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = el ? el.scrollTop : window.scrollY;
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

      const statement = statementRef.current;
      if (statement && statement.dataset.cueDismissed !== 'true') {
        const rect = statement.getBoundingClientRect();
        if (rect.top < window.innerHeight * -0.3) statement.dataset.cueDismissed = 'true';
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

  // One guarded clock begins the first time the statement is 30 percent visible.
  useEffect(() => {
    const statement = statementRef.current;
    if (!statement) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setProgress = (name: string, value: number) => statement.style.setProperty(name, value.toFixed(4));
    let frame = 0;
    let started = false;
    let visible = false;
    if (reduced) {
      ['--answer-progress', '--block-exit', '--brand-trinity-progress', '--brand-marketing-progress', '--bold-progress']
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
    };
    const mark = (node: HTMLElement | null, active: boolean) => {
      if (node) node.dataset.animating = active ? 'true' : 'false';
    };
    const start = () => {
      if (started || !visible) return;
      started = true;
      const startedAt = performance.now();
      const frameCosts: number[] = [];
      const visibleAt: Record<string, number> = {};
      statement.dataset.sequence = 'playing';
      statement.dataset.latched = 'true';
      statement.dataset.sequenceStarts = String(Number(statement.dataset.sequenceStarts || '0') + 1);
      statement.dataset.sequenceStarted = startedAt.toFixed(2);
      statement.dataset.lineOneAt = '0';
      statement.dataset.lineTwoAt = '1100';
      statement.dataset.slamAt = '2800';
      statement.dataset.trinityAt = '2800';
      statement.dataset.marketingAt = '2880';
      statement.dataset.boldAt = '3300';
      statement.dataset.sequenceEnd = '4300';
      statement.dataset.cueAt = '4900';
      mark(nodes.typing, true);
      const draw = (now: number) => {
        const workStarted = performance.now();
        const time = now - startedAt;
        setProgress('--answer-progress', easeOut(range(time, 1100, 1320)));
        setProgress('--block-exit', easeOut(range(time, 2800, 3020)));
        setProgress('--brand-trinity-progress', easeOut(range(time, 2800, 3060)));
        setProgress('--brand-marketing-progress', easeOut(range(time, 2880, 3060)));
        setProgress('--bold-progress', easeOut(range(time, 3300, 3560)));
        if (time >= 2800 && statement.dataset.impact !== 'true') {
          statement.setAttribute('data-impact', 'true');
        }
        if (time >= 3020 && statement.dataset.phase !== 'final') statement.dataset.phase = 'final';
        mark(nodes.typing, time >= 1100 && time < 3020);
        mark(nodes.brand, time >= 2800 && time < 3060);
        mark(nodes.bold, time >= 3300 && time < 3560);
        const recordVisible = (key: string, active: boolean) => {
          if (active && visibleAt[key] === undefined) {
            visibleAt[key] = time;
            statement.dataset[`${key}VisibleAt`] = time.toFixed(1);
          }
        };
        recordVisible('lineOne', true);
        recordVisible('lineTwo', time >= 1100);
        recordVisible('brand', time >= 2800);
        recordVisible('trinity', time >= 2800);
        recordVisible('marketing', time >= 2880);
        recordVisible('bold', time >= 3300);
        frameCosts.push(performance.now() - workStarted);
        if (time < 4300) frame = requestAnimationFrame(draw);
        else {
          ['--answer-progress', '--block-exit', '--brand-trinity-progress', '--brand-marketing-progress', '--bold-progress']
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
    statement.dataset.sequence = 'idle';
    statement.dataset.phase = 'typing';
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.30);
      if (visible) start();
    }, { threshold: [0.30] });
    observer.observe(statement);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
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

      <AskSheet watchId="cover-stage" completionId="statement" />

      <main className="relative flex-1">
        {/* The pinned stage owns only the logo assembly, burst and white swell. */}
        <section ref={stageRef} id="cover-stage" className="cover-stage relative isolate">
          <div className="cover-stage-pin cover-open cover-hero relative isolate px-5 sm:px-6">
            <CoverLogo progress={heroProgress} onBurst={onBurst} onWorldLight={onWorldLight} />
            <div className="cover-first-message text-center">
              <h1 className="cover-first-headline">Pest control. Fiber internet. Life insurance.</h1>
              <p className="cover-first-support">Where being a sales rep is not the end goal.</p>
              {COVER_STATS && <ProofHeadline />}
              <Link
                to="/apply/rookie"
                onClick={onPrimaryTap}
                data-cover-apply
                className="btn-primary cover-first-apply"
              >
                Get in <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="cover-scroll-cue" data-hidden={heroProgress > 0.04 ? 'true' : 'false'} aria-hidden="true">
              <span className="cover-scroll-label">See all three</span>
              <span className="cover-scroll-track"><span className="cover-scroll-bead" /></span>
              <span className="cover-scroll-chevron" />
            </div>

          </div>
        </section>

        <section ref={statementRef} id="statement" className="cover-statement px-5 text-center sm:px-6">
          <div className="cover-statement-copy mx-auto w-full max-w-6xl">
                <div className="cover-typing-phase" data-copy-block="typing" data-sequence-part="typing" data-animating="false">
                  <p className="cover-statement-line cover-statement-line-one">Everyone argues over which industry is best.</p>
                  <p className="cover-statement-line cover-statement-line-two">So we joined ALL THREE.</p>
                </div>
                <div className="cover-final-phase">
                  <h1 className="cover-brand-slam" data-copy-block="brand" data-sequence-part="brand" data-animating="false">
                    <span className="cover-brand-impact"><span className="cover-brand-trinity">TRINITY</span><span className="cover-brand-marketing">MARKETING</span></span>
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
                <div className="statement-scroll-cue" aria-hidden="true">
                  <span className="statement-scroll-label">See all three</span>
                  <span className="statement-scroll-track"><span className="statement-scroll-bead" /></span>
                  <span className="statement-scroll-chevron" />
                </div>
                <svg className="statement-ridgeline-floor" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
                  <path d={RIDGES[0]} fill="#F2F2F4" />
                  <path d={RIDGES[2]} fill="#F7F7F9" />
                  <path d={RIDGES[4]} fill="#FBFBFC" />
                </svg>
          </div>
        </section>


        <ThreeDoorSection />

        {/* The three questions, in the page for anyone who closed the sheet. */}
        <AskSection />

        {/* Final band */}
        <section
          ref={bandRef}
          id="apply"
          className="cover-open relative px-5 py-16 text-center sm:px-6 md:py-24"
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
            {COVER_STATS && <ProofSet />}
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
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="public-link inline-flex min-h-11 items-center px-3 text-sm"
            >
              @summitmktgsales
            </a>
          </div>
        </div>
      </footer>
      {COVER_STATS && <ProductionTicker />}
    </div>
  );
};

export default Index;
