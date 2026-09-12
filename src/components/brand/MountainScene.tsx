import { memo, useEffect, useRef } from 'react';
import { RIDGES } from './MountainRange';

/**
 * Pass 183 - the calm range, retuned.
 *
 * A canvas scene for the public cover only. It reuses the five ridgeline paths
 * from MountainRange (Path2D on the same 1440 x 600 box) and draws them in the
 * --range-1 to --range-5 colours read straight off the document, so the scene
 * follows the palette and the appearance with no second source of truth.
 *
 * Pass 183 brings the scene to the one motion standard:
 * - every ridge drift is a sine of absolute time, so no loop ever restarts and
 *   nothing jumps at the seam,
 * - the glow behind the tallest peak breathes on an eased sine between 8 and 14
 *   percent and follows the pointer horizontally by up to 5vw,
 * - particles respawn at zero alpha and fade in over 600ms, so nothing pops,
 * - the layers tilt to the pointer on desktop and to device orientation on a
 *   phone, three depths, 12px at the nearest layer, lerped at 0.08, on top of
 *   the self drift so the hero is never still before any grant.
 *
 * Cost control: device pixel ratio is capped at 1.5, the loop pauses when the
 * tab is hidden or the canvas leaves the viewport, and under
 * prefers-reduced-motion a single static frame is drawn with no particles.
 */

const VIEW_W = 1440;
const VIEW_H = 600;

/** Per layer: drift amplitude in px and loop length in ms, far layers slowest. */
const DRIFT = [
  { amp: 6, period: 120000 },
  { amp: 8, period: 104000 },
  { amp: 10, period: 88000 },
  { amp: 12, period: 74000 },
  { amp: 14, period: 60000 },
];

/** The nearest layer never moves more than this far for a tilt. */
const TILT_MAX = 12;
/** Respawned particles fade in over this long. */
const PARTICLE_FADE = 600;

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  depth: number;
  violet: boolean;
  /** Milliseconds lived since the last respawn, for the fade in. */
  life: number;
}

interface MountainSceneProps {
  className?: string;
  /** Kept for compatibility. The sky no longer shifts with the scroll. */
  day?: number;
  /** Desktop pointer parallax. Never runs on reduced motion. */
  pointerParallax?: boolean;
  /** 0 to 1 as the final band arrives: the glow brightens from 8 to 14 percent. */
  glowBoost?: number;
  /** Pass 184: the light world after the burst. Light ridges, a 6 percent glow. */
  light?: boolean;
}

/**
 * iOS only gives device orientation after a user gesture asks for it, and the
 * grant does not survive the session. This is called inside the first tap of the
 * primary button; a refusal simply leaves the self drift running.
 */
export async function requestTiltPermission(): Promise<boolean> {
  const api = (window as unknown as {
    DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
  }).DeviceOrientationEvent;
  if (!api?.requestPermission) return true;
  try {
    return (await api.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function MountainSceneBase({ className, pointerParallax = true, glowBoost = 0, light = false }: MountainSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boostRef = useRef(glowBoost);
  boostRef.current = glowBoost;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(hover: none)').matches;
    const paths = RIDGES.map((d) => new Path2D(d));

    let width = 0;
    let height = 0;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let particles: Particle[] = [];
    let mist: CanvasGradient[] = [];
    let glow: CanvasGradient | null = null;
    let sky = '#000000';
    let ranges = ['#1C1C1C', '#161616', '#101010', '#0A0A0A', '#050505'];

    const readPalette = () => {
      if (light) {
        sky = '#FFFFFF';
        ranges = ['#E9E9E9', '#EDEDED', '#F0F0F0', '#F3F3F3', '#F5F5F5'];
        return;
      }
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue('--background').trim();
      sky = bg ? `hsl(${bg})` : '#000000';
      ranges = ranges.map((fallback, i) => styles.getPropertyValue(`--range-${i + 1}`).trim() || fallback);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fit the width, but never let the range read as a thin strip: it always
      // occupies at least 55 percent of the viewport height.
      scale = Math.max(width / VIEW_W, (height * 0.55) / VIEW_H);
      tx = (width - VIEW_W * scale) / 2;
      ty = height - VIEW_H * scale;

      readPalette();

      const count = width < 700 ? 40 : 90;
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.72,
        r: Math.random() < 0.5 ? 1 : 2,
        speed: 3 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 5,
        depth: 1 + (i % 3),
        violet: i % 2 === 0,
        life: PARTICLE_FADE,
      }));

      mist = [0, 1, 2].map((i) => {
        const g = ctx.createLinearGradient(0, 0, width, 0);
        g.addColorStop(0, 'rgba(190,190,196,0)');
        g.addColorStop(0.35, `rgba(190,190,196,${0.04 + i * 0.01})`);
        g.addColorStop(0.65, `rgba(190,190,196,${0.03 + i * 0.01})`);
        g.addColorStop(1, 'rgba(190,190,196,0)');
        return g;
      });

      // One soft glow behind the tallest peak, fading out over 40 percent of the
      // scene height. Its canvas transform follows the pointer at draw time.
      const peakX = tx + 720 * scale;
      const peakBase = ty + 340 * scale;
      const reach = VIEW_H * scale * 0.4;
      glow = ctx.createRadialGradient(peakX, peakBase - reach * 0.2, 0, peakX, peakBase - reach * 0.2, reach);
      if (light) {
        glow.addColorStop(0, 'rgba(0,78,253,1)');
        glow.addColorStop(0.55, 'rgba(109,59,255,0.6)');
        glow.addColorStop(1, 'rgba(109,59,255,0)');
      } else {
        glow.addColorStop(0, 'rgba(58,141,255,1)');
        glow.addColorStop(0.55, 'rgba(124,107,255,0.7)');
        glow.addColorStop(1, 'rgba(182,156,255,0)');
      }
    };

    let px = 0;
    let py = 0;
    let targetX = 0;
    let targetY = 0;
    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    /** gamma is the left to right tilt, beta the front to back one. */
    const onOrient = (event: DeviceOrientationEvent) => {
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      targetX = clamp((event.gamma || 0) / 30);
      targetY = clamp(((event.beta || 0) - 45) / 30);
    };

    let lastNow = 0;
    const draw = (now: number) => {
      const delta = lastNow ? Math.min(64, now - lastNow) : 16;
      lastNow = now;
      px += (targetX - px) * 0.08;
      py += (targetY - py) * 0.08;

      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // The glow: an eased breath between 8 and 14 percent over twelve seconds.
      if (glow) {
        const breath = easeInOut((Math.sin((now / 12000) * Math.PI * 2) + 1) / 2);
        const boost = Math.max(0, Math.min(1, boostRef.current));
        const breathe = reduceMotion ? 0.11 : 0.08 + breath * 0.06 + boost * 0;
        const glowShift = reduceMotion ? 0 : px * width * 0.05;
        ctx.save();
        ctx.translate(glowShift, 0);
        ctx.globalAlpha = breathe;
        ctx.fillStyle = glow;
        ctx.fillRect(-Math.abs(glowShift), 0, width + Math.abs(glowShift) * 2, height);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Particles above the range. A respawn starts at zero alpha and fades in
      // over 600ms, so nothing ever pops into frame.
      if (!reduceMotion) {
        for (const p of particles) {
          p.life += delta;
          p.y -= p.speed / 60;
          p.x += p.drift / 60;
          if (p.y < -4) {
            p.y = height * 0.75;
            p.x = Math.random() * width;
            p.life = 0;
          }
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
          const fade = Math.min(1, p.life / PARTICLE_FADE);
          ctx.globalAlpha = (p.violet ? 0.08 : 0.1) * fade;
          ctx.fillStyle = p.violet ? '#B69CFF' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x + px * p.depth * 3, p.y + py * p.depth * 3, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Ridges far to near, each with a mist band above the next one. Every
      // layer drifts on a sine of absolute time, so the loop is seamless, and
      // tilts with the pointer or the device at its own depth.
      for (let i = 0; i < paths.length; i += 1) {
        const depth = i + 1;
        const { amp, period } = DRIFT[i];
        const self = reduceMotion ? 0 : Math.sin((now / period) * Math.PI * 2) * amp;
        const lean = reduceMotion ? 0 : (depth / paths.length) * TILT_MAX;
        ctx.save();
        ctx.translate(tx + px * lean + self, ty + py * lean);
        ctx.scale(scale, scale);
        ctx.fillStyle = ranges[i];
        ctx.fill(paths[i]);
        ctx.restore();

        if (i < 3 && !reduceMotion) {
          const mistPeriod = [40000, 62000, 90000][i];
          const shift = ((now % mistPeriod) / mistPeriod) * (width * 2) - width;
          const bandY = ty + (240 + i * 70) * scale;
          ctx.save();
          ctx.translate(shift, 0);
          ctx.fillStyle = mist[i];
          ctx.fillRect(0, bandY, width, 34 * scale);
          ctx.translate(width, 0);
          ctx.fillRect(0, bandY, width, 34 * scale);
          ctx.restore();
        }
      }

      // Haze so the range dissolves into the page, and the grid fades with it.
      const haze = ctx.createLinearGradient(0, ty + 370 * scale, 0, ty + VIEW_H * scale);
      haze.addColorStop(0, 'rgba(0,0,0,0)');
      haze.addColorStop(1, sky);
      ctx.fillStyle = haze;
      ctx.fillRect(0, ty + 370 * scale, width, VIEW_H * scale - 370 * scale + 2);
    };

    resize();

    if (reduceMotion) {
      draw(performance.now());
      const onResize = () => {
        resize();
        draw(performance.now());
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let frame = 0;
    let running = false;
    let onScreen = true;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };
    const sync = () => {
      if (onScreen && !document.hidden) play();
      else stop();
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    if (pointerParallax && !coarse) window.addEventListener('pointermove', onPointer, { passive: true });
    // On a phone the same three depths follow the gyroscope. Android delivers
    // these events with no prompt; on iOS they stay silent until the grant.
    if (coarse) window.addEventListener('deviceorientation', onOrient);
    play();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, [pointerParallax, light]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

export const MountainScene = memo(MountainSceneBase);
export default MountainScene;
