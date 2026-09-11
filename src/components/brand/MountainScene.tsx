import { memo, useEffect, useRef } from 'react';
import { RIDGES } from './MountainRange';

/**
 * Pass 181 - the calm range.
 *
 * A canvas scene for the public cover only. It reuses the five ridgeline paths
 * from MountainRange (Path2D on the same 1440 x 600 box) and draws them in the
 * --range-1 to --range-5 colours read straight off the document, so the scene
 * follows the palette and the appearance with no second source of truth.
 *
 * The sky no longer shifts colour: it stays the page background top to bottom.
 * Behind the tallest peak sits one soft radial glow that blends blue into
 * violet and breathes between 6 and 10 percent on a twelve second loop. Each
 * ridge drifts horizontally on its own slow loop, so the range moves without
 * any scroll. Three neutral mist bands and a sparse rising particle field stay.
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

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  depth: number;
  violet: boolean;
}

interface MountainSceneProps {
  className?: string;
  /** Kept for compatibility. The sky no longer shifts with the scroll. */
  day?: number;
  /** Desktop pointer parallax. Never runs on touch or reduced motion. */
  pointerParallax?: boolean;
}

function MountainSceneBase({ className, pointerParallax = true }: MountainSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      }));

      mist = [0, 1, 2].map((i) => {
        const g = ctx.createLinearGradient(0, 0, width, 0);
        g.addColorStop(0, 'rgba(190,190,196,0)');
        g.addColorStop(0.35, `rgba(190,190,196,${0.04 + i * 0.01})`);
        g.addColorStop(0.65, `rgba(190,190,196,${0.03 + i * 0.01})`);
        g.addColorStop(1, 'rgba(190,190,196,0)');
        return g;
      });

      // One soft glow behind the tallest peak: blue at the base into violet at
      // the top, fading out over 40 percent of the scene height.
      const peakX = tx + 720 * scale;
      const peakBase = ty + 340 * scale;
      const reach = VIEW_H * scale * 0.4;
      glow = ctx.createLinearGradient(peakX, peakBase, peakX, peakBase - reach);
      glow.addColorStop(0, 'rgba(58,141,255,1)');
      glow.addColorStop(0.55, 'rgba(124,107,255,0.7)');
      glow.addColorStop(1, 'rgba(182,156,255,0)');
    };

    let px = 0;
    let py = 0;
    let targetX = 0;
    let targetY = 0;
    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const draw = (now: number) => {
      px += (targetX - px) * 0.08;
      py += (targetY - py) * 0.08;

      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // The glow, breathing between 6 and 10 percent over twelve seconds.
      if (glow) {
        const breathe = reduceMotion ? 0.08 : 0.08 + 0.02 * Math.sin((now / 12000) * Math.PI * 2);
        ctx.globalAlpha = breathe;
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // Particles above the range.
      if (!reduceMotion) {
        for (const p of particles) {
          p.y -= p.speed / 60;
          p.x += p.drift / 60;
          if (p.y < -4) {
            p.y = height * 0.75;
            p.x = Math.random() * width;
          }
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
          ctx.globalAlpha = p.violet ? 0.08 : 0.1;
          ctx.fillStyle = p.violet ? '#B69CFF' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x + px * p.depth * 3, p.y + py * p.depth * 3, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Ridges far to near, each with a mist band above the next one. Every
      // layer also drifts horizontally on its own slow loop.
      for (let i = 0; i < paths.length; i += 1) {
        const depth = i + 1;
        const { amp, period } = DRIFT[i];
        const self = reduceMotion ? 0 : Math.sin((now / period) * Math.PI * 2) * amp;
        ctx.save();
        ctx.translate(tx + px * depth * 1.2 + self, ty + py * depth * 1.2);
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
    play();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [pointerParallax]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

export const MountainScene = memo(MountainSceneBase);
export default MountainScene;
