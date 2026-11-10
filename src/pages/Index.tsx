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
import { ReferralLookup } from '@/components/recruiting/ReferralLookup';
import { CoverLogo } from '@/components/brand/CoverLogo';
import { ProofSet } from '@/components/recruiting/ProofLines';
import { ReferrerLine } from '@/components/recruiting/ReferrerLine';
import { Button } from '@/components/ui/button';


/**
 * Public front door for Trinity Sales.
 *
 * One pinned stage contains the logo, burst and reversible statement.
 * Remapped travel drives the logo; its burst callbacks drive the statement.
 */
const Index = () => {
  const media = useCoverMedia();
  const stageRef = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLElement | null>(null);
  // True once the white has covered the screen, false again on the way back.
  const [worldLight, setWorldLight] = useState(false);
  const [burst, setBurst] = useState(false);
  // Scroll progress over the first viewport, which drives the logo.
  const [heroProgress, setHeroProgress] = useState(0);
  // The final band's own progress, which lifts the scene glow.
  const [bandProgress, setBandProgress] = useState(0);
  const tiltAsked = useRef(false);
  const onWorldLight = useCallback((light: boolean) => setWorldLight(light), []);
  const onBurst = useCallback((active: boolean) => setBurst(active), []);
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

  return (
    <div
      className="gold-world public-world relative flex min-h-screen flex-col"
      data-world={worldLight ? 'light' : 'dark'}
      data-burst={burst ? 'true' : 'false'}
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

      <main className="relative flex-1">
        {/* The statement arrives inside the same pin as the white swell. */}
        <section ref={stageRef} id="cover-stage" className="cover-stage relative isolate">
          <div className="cover-stage-pin cover-open cover-hero relative isolate px-5 sm:px-6">
            <CoverLogo progress={Math.min(1, Math.max(0, heroProgress / 0.4))} onBurst={onBurst} onWorldLight={onWorldLight} />
            <div className="cover-first-message text-center">
              <p className="cover-first-line">Pest control. Fiber internet. Life insurance.</p>
              <ReferrerLine />
              <Button asChild className="cover-first-apply mt-5 min-w-36 px-8">
                <Link to="/apply/rookie">Apply <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <div className="cover-first-links mt-2 flex items-center justify-center gap-5">
                <Link to="/recruiting" className="public-link inline-flex min-h-11 items-center text-sm">See the role</Link>
                <Link to="/parents" className="public-link inline-flex min-h-11 items-center text-sm">For parents</Link>
              </div>
            </div>
            <div className="cover-scroll-cue" data-hidden={heroProgress > 0.04 ? 'true' : 'false'} aria-hidden="true">
              <span className="cover-scroll-label">See all three</span>
              <span className="cover-scroll-track"><span className="cover-scroll-bead" /></span>
              <span className="cover-scroll-chevron" />
            </div>
            <div className="cover-statement-layer">
              <h1 className="statement-brand">TRINITY MARKETING</h1>
              <p className="statement-support">Where being a sales rep is not the end goal.</p>
              <Button asChild className="btn-purple statement-learn">
                <Link to="/apply/rookie">Apply</Link>
              </Button>
            </div>
          </div>
        </section>


        <ThreeDoorSection />


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
              className="btn-purple mt-7 inline-flex items-center justify-center gap-2 px-8"
            >
              Apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {COVER_STATS && <ProofSet />}
            <p className="mt-6 text-sm text-text-secondary">
              <Link to="/industries/pest" className="public-link">Pest control: $200,000+ Top rookie, last summer · $37,000 Average rookie, last summer</Link>
            </p>
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
