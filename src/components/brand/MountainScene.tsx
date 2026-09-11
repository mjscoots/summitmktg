import { memo, useEffect, useRef } from 'react';
import { RIDGES } from './MountainRange';

/**
 * Pass 178 - the living range.
 *
 * A canvas scene for the public cover only. It reuses the five ridgeline paths
 * from MountainRange (Path2D on the same 1440 x 600 box, xMid / yMax slice) and
 * adds atmosphere: three drifting mist bands, a slow warm light band behind the
 * tallest peak, a sparse rising particle field and an ember horizon line that
 * draws in once along the crest of the far ridge.
 *
 * Time of day is a scalar 0 to 1. Zero is the night base, one lifts the sky and
 * brightens the far ridges one step. The hero eases 0 to 0.35 on load, then the
 * `day` prop (driven by scroll) takes over.
 *
 * Cost control: device pixel ratio is capped at 1.5, the loop pauses when the
 * tab is hidden or the canvas leaves the viewport, and under
 * prefers-reduced-motion a single static frame is drawn with no particles.
 */

const VIEW_W = 1440;
const VIEW_H = 600;
const INTRO_MS = 1500;
const HORIZON_MS = 1200;
const HORIZON_LEN = 4200;

const SKY_NIGHT = [12, 11, 10];
const SKY_DAWN = [30, 22, 18];

/** Far to near, matching --range-1 .. --range-5. */
const RIDGE_NIGHT = [
  [42, 35, 30],
  [34, 28, 24],
  [26, 21, 18],
  [20, 16, 14],
  [15, 12, 10],
];

/** One step brighter with a blue lean, reached at time of day 1. */
const RIDGE_DAWN = [
  [66, 54, 44],
  [52, 42, 35],
  [40, 32, 27],
  [30, 24, 20],
  [22, 18, 15],
];

function mix(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  depth: number;
  lime: boolean;
}

interface MountainSceneProps {
  className?: string;
  /** Target time of day, 0 to 1. The cover feeds this from scroll. */
  day?: number;
  /** Desktop pointer parallax. Never runs on touch or reduced motion. */
  pointerParallax?: boolean;
  /**
   * Pass 179 - the climb. 0 puts the ember marker at the left foot of the far
   * ridge, 1 puts it on the summit. Undefined hides the marker.
   */
  climb?: number;
  /** Pass 179 - a soft light ripple from a tap on the range. */
  ripple?: boolean;
}

function MountainSceneBase({
  className,
  day = 0.35,
  pointerParallax = true,
  climb,
  ripple = false,
}: MountainSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dayRef = useRef(day);
  dayRef.current = day;
  const climbRef = useRef(climb);
  climbRef.current = climb;


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(hover: none)').matches;
    const paths = RIDGES.map((d) => new Path2D(d));

    // The crest of the far ridge, sampled once in view units so the climb
    // marker can ride it. The samples run from the left foot to the summit.
    const crest: { x: number; y: number }[] = [];
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      svg.style.opacity = '0';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', RIDGES[0]);
      svg.appendChild(path);
      document.body.appendChild(svg);
      const total = path.getTotalLength();
      for (let i = 0; i <= 240; i += 1) {
        const point = path.getPointAtLength((total * i) / 240);
        if (point.y < 330 && point.x >= -20 && point.x <= 730) crest.push({ x: point.x, y: point.y });
      }
      document.body.removeChild(svg);
      crest.sort((a, b) => a.x - b.x);
    } catch {
      /* the marker simply does not render */
    }

    interface Ripple {
      x: number;
      y: number;
      start: number;
    }
    let ripples: Ripple[] = [];
    const RIPPLE_MS = 700;


    let width = 0;
    let height = 0;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let particles: Particle[] = [];
    let mist: CanvasGradient[] = [];
    let glow: CanvasGradient | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fit the width, but never let the range read as a thin strip: it always
      // occupies at least 55 percent of the viewport height, cropping the outer
      // ridges on a phone the way the SVG range does.
      scale = Math.max(width / VIEW_W, (height * 0.55) / VIEW_H);
      tx = (width - VIEW_W * scale) / 2;
      ty = height - VIEW_H * scale;

      const count = width < 700 ? 60 : 160;
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.72,
        r: Math.random() < 0.5 ? 1 : 2,
        speed: 4 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 6,
        depth: 1 + (i % 3),
        lime: i % 3 === 0,
      }));

      mist = [0, 1, 2].map((i) => {
        const g = ctx.createLinearGradient(0, 0, width, 0);
        g.addColorStop(0, 'rgba(230,214,190,0)');
        g.addColorStop(0.35, `rgba(230,214,190,${0.05 + i * 0.012})`);
        g.addColorStop(0.65, `rgba(230,214,190,${0.04 + i * 0.012})`);
        g.addColorStop(1, 'rgba(230,214,190,0)');
        return g;
      });

      const peakX = tx + 720 * scale;
      const peakY = ty + 150 * scale;
      glow = ctx.createRadialGradient(peakX, peakY, 0, peakX, peakY, Math.max(width, height) * 0.55);
      // Dawn gold lives only inside the canvas scene, never in the interface.
      glow.addColorStop(0, 'rgba(245,185,75,1)');
      glow.addColorStop(0.55, 'rgba(242,103,58,0.5)');
      glow.addColorStop(1, 'rgba(242,103,58,0)');
    };

    let px = 0;
    let py = 0;
    let targetX = 0;
    let targetY = 0;
    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const start = performance.now();
    let current = 0;

    const draw = (now: number) => {
      const elapsed = now - start;
      const target = elapsed < INTRO_MS
        ? 0.35 * (1 - Math.pow(1 - elapsed / INTRO_MS, 3))
        : dayRef.current;
      current = reduceMotion ? 0.35 : current + (target - current) * 0.06;
      px += (targetX - px) * 0.08;
      py += (targetY - py) * 0.08;

      ctx.fillStyle = mix(SKY_NIGHT, SKY_DAWN, current);
      ctx.fillRect(0, 0, width, height);

      // Light band behind the tallest peak, breathing over 12 seconds.
      if (glow) {
        const breathe = reduceMotion ? 1 : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((now / 12000) * Math.PI * 2));
        ctx.globalAlpha = 0.08 * breathe;
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // Particles above the range.
      if (!reduceMotion) {
        for (const p of particles) {
          p.y -= (p.speed / 60);
          p.x += p.drift / 60;
          if (p.y < -4) {
            p.y = height * 0.75;
            p.x = Math.random() * width;
          }
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
          ctx.globalAlpha = p.lime ? 0.25 : 0.15;
          ctx.fillStyle = p.lime ? '#F2673A' : '#F5B94B';
          ctx.beginPath();
          ctx.arc(p.x + px * p.depth * 3, p.y + py * p.depth * 3, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Ridges far to near, each with a mist band above the next one.
      for (let i = 0; i < paths.length; i += 1) {
        const depth = i + 1;
        ctx.save();
        ctx.translate(tx + px * depth * 1.2, ty + py * depth * 1.2);
        ctx.scale(scale, scale);
        ctx.fillStyle = mix(RIDGE_NIGHT[i], RIDGE_DAWN[i], current);
        ctx.fill(paths[i]);

        if (i === 0) {
          // The ember crest draws in once over 1.2 seconds.
          const p = reduceMotion ? 1 : Math.min(1, elapsed / HORIZON_MS);
          ctx.strokeStyle = 'rgba(242,103,58,0.5)';
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([HORIZON_LEN, HORIZON_LEN]);
          ctx.lineDashOffset = HORIZON_LEN * (1 - p);
          ctx.stroke(paths[i]);
          ctx.setLineDash([]);
        }
        ctx.restore();

        if (i < 3 && !reduceMotion) {
          const period = [40000, 62000, 90000][i];
          const shift = ((now % period) / period) * (width * 2) - width;
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

      // Haze so the range dissolves into the page, as the SVG range does.
      const haze = ctx.createLinearGradient(0, ty + 370 * scale, 0, ty + VIEW_H * scale);
      const sky = mix(SKY_NIGHT, SKY_DAWN, current).slice(4, -1);
      haze.addColorStop(0, `rgba(${sky},0)`);
      haze.addColorStop(1, `rgba(${sky},1)`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, ty + 370 * scale, width, VIEW_H * scale - 370 * scale + 2);

      // Pass 179 - the climb. Under reduced motion the marker sits on the
      // summit and never moves.
      const climbValue = climbRef.current;
      if (typeof climbValue === 'number' && crest.length > 1) {
        const p = reduceMotion ? 1 : Math.min(1, Math.max(0, climbValue));
        const point = crest[Math.round(p * (crest.length - 1))];
        const mxp = tx + px * 1.2 + point.x * scale;
        const myp = ty + py * 1.2 + point.y * scale;
        const halo = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, 22);
        halo.addColorStop(0, 'rgba(242,103,58,0.35)');
        halo.addColorStop(1, 'rgba(242,103,58,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mxp - 22, myp - 22, 44, 44);
        ctx.fillStyle = '#F2673A';
        ctx.beginPath();
        ctx.arc(mxp, myp, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 179 - a soft light ripple from a tap on the range.
      if (!reduceMotion && ripples.length) {
        ripples = ripples.filter((r) => now - r.start < RIPPLE_MS);
        for (const r of ripples) {
          const t = (now - r.start) / RIPPLE_MS;
          const eased = 1 - Math.pow(1 - t, 3);
          ctx.globalAlpha = 0.22 * (1 - t);
          ctx.strokeStyle = '#F2673A';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 8 + eased * 180, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
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

    // A tap on the range sends a ripple. Taps on anything the visitor can use
    // are left alone, so the ripple never competes with a button or a link.
    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button, input, textarea, select, [role="button"]')) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      ripples.push({ x, y, start: performance.now() });
      if (ripples.length > 4) ripples.shift();
    };
    if (ripple) window.addEventListener('pointerdown', onDown, { passive: true });
    play();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [pointerParallax, ripple]);


  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

export const MountainScene = memo(MountainSceneBase);
export default MountainScene;
