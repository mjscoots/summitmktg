import { memo, useEffect, useRef } from 'react';
import { LETTERS_PATH, LOGO_ASPECT, LOGO_BLUE, MOUNTAIN_PATH } from './logoPaths';

/**
 * Pass 183 - the opening, the living headline and the sweep. Cover only.
 *
 * On every load of the cover the real logo draws itself centred in the hero,
 * holds, shatters into thousands of pieces, and those pieces are pulled into the
 * shape of the two line headline before the DOM headline crossfades in on top.
 * The letter pieces are white and the mountain pieces are the logo blue, so the
 * shatter reads as the logo coming apart.
 *
 * Once it settles a sparse residual field stays inside the glyph shapes, so the
 * headline is never completely still, and it answers a pointer or a touch by
 * pushing away and springing back. On scroll the same field answers the sweep:
 * the headline tears off the right edge and reassembles on the way back, with
 * the DOM text and the field crossfading between p 0.04 and p 0.12.
 *
 * Everything drawn here is transform and opacity work on one canvas. No layout
 * property is ever animated, the device pixel ratio is capped at 1.5, and the
 * loop stops while the tab is hidden. Under prefers-reduced-motion this
 * component renders nothing.
 */

const T_DRAW = 500;
const T_HOLD = 250;
const T_BURST = 800;
const T_FORM = 1000;
const T_CROSS = 200;
const FONT_TIMEOUT = 2500;

const DRAW_END = T_DRAW + T_HOLD;
const BURST_END = DRAW_END + T_BURST;
const FORM_END = BURST_END + T_FORM;

/** The sweep crossfade window, as scroll progress. */
const SWEEP_IN = 0.04;
const SWEEP_FULL = 0.12;

/** The second headline line settles as the gradient: blue into violet. */
const BLUE = '#3A8DFF';
const VIOLET = '#B69CFF';
const WHITE = '#FFFFFF';
/** Painted into the target sample so line two can be recoloured on pairing. */
const LINE_TWO_KEY = 'rgb(58,141,255)';
/** Painted into the lockup sample so mountain pixels stay the logo blue. */
const MOUNTAIN_KEY = 'rgb(0,78,253)';

/** The logo box, as a share of the hero width. */
const LOGO_WIDTH_PHONE = 0.78;
const LOGO_WIDTH_DESKTOP = 0.46;

/** The living headline field. */
const LIVING_PHONE = 160;
const LIVING_DESKTOP = 420;
const PUSH_RADIUS = 90;
const PUSH_RETURN = 400;

/** The spring easing token, as a function. */
function spring(t: number): number {
  const c = 1.70158 + 1;
  const p = t - 1;
  return 1 + c * p * p * p + 1.70158 * p * p;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Particle {
  /** Start (the sampled logo pixel) and the colour it starts as. */
  sx: number;
  sy: number;
  scolor: string;
  /** Burst destination. */
  bx: number;
  by: number;
  /** Headline target, or null for an ember with nowhere to go. */
  tx: number | null;
  ty: number | null;
  color: string;
  /** Per particle wind factors for the sweep. */
  wx: number;
  wy: number;
  seed: number;
}

interface Living {
  x: number;
  y: number;
  color: string;
  alpha: number;
  seed: number;
  amp: number;
  /** Current push offset, springing back to zero. */
  ox: number;
  oy: number;
}

export interface LogoBurstProps {
  /** The real headline, used for the target shape and the crossfade. */
  headlineRef: React.RefObject<HTMLElement>;
  /** Scroll progress over the first 60vh, 0 to 1. */
  progress: number;
  /** Called with false while the particles stand in for the headline. */
  onHeadlineVisible?: (visible: boolean) => void;
  /** Called once the hero is settled, so the rest of it can fade up. */
  onSettled?: () => void;
}

export function shouldRunIntro(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function LogoBurstBase({ headlineRef, progress, onHeadlineVisible, onSettled }: LogoBurstProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const headline = headlineRef.current;
    if (!host || !canvas || !headline) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const phone = window.innerWidth < 700;
    const step = phone ? 3 : 2;
    const cap = phone ? 2400 : 7000;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const letterPath = new Path2D(LETTERS_PATH);
    const mountainPath = new Path2D(MOUNTAIN_PATH);

    let width = host.clientWidth;
    let height = host.clientHeight;
    let particles: Particle[] = [];
    let sourceGroups = new Map<string, Particle[]>();
    let targetGroups = new Map<string, Particle[]>();
    let living: Living[] = [];
    let settled = false;
    let jumped = false;
    let frame = 0;
    let start = 0;
    let lockupBox = { x: 0, y: 0, w: 0, h: 0 };
    let headlineShown = true;
    let headlineFade = -1;
    const showHeadline = (visible: boolean) => {
      if (visible === headlineShown) return;
      headlineShown = visible;
      onHeadlineVisible?.(visible);
    };
    /** The scroll crossfade is written straight to the node, not through state. */
    const fadeHeadline = (value: number) => {
      const next = Math.round(value * 100) / 100;
      if (next === headlineFade) return;
      headlineFade = next;
      headline.style.opacity = next >= 1 ? '' : String(next);
    };

    const size = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Samples a drawn offscreen canvas into a list of coloured points. */
    const sample = (paint: (c: CanvasRenderingContext2D) => void, grain = step) => {
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(width));
      off.height = Math.max(1, Math.round(height));
      const octx = off.getContext('2d');
      if (!octx) return [] as { x: number; y: number; color: string }[];
      paint(octx);
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const points: { x: number; y: number; color: string }[] = [];
      for (let y = 0; y < off.height; y += grain) {
        for (let x = 0; x < off.width; x += grain) {
          const i = (y * off.width + x) * 4;
          if (data[i + 3] > 128) {
            points.push({ x, y, color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
          }
        }
      }
      return points;
    };

    const headlineStyle = getComputedStyle(headline);
    const headlineFont = `${headlineStyle.fontWeight} ${headlineStyle.fontSize} ${headlineStyle.fontFamily}`;

    /**
     * The real logo, centred: 78vw wide on a phone and 46vw on desktop, at the
     * traced aspect of 1625 by 281. The letters paint white and the mountain
     * paints the logo blue, so the sample carries both colours.
     */
    const paintLockup = (c: CanvasRenderingContext2D) => {
      const logoW = width * (phone ? LOGO_WIDTH_PHONE : LOGO_WIDTH_DESKTOP);
      const logoH = logoW / LOGO_ASPECT;
      const scale = logoW / 1625;
      lockupBox = { x: (width - logoW) / 2, y: (height - logoH) / 2, w: logoW, h: logoH };
      c.save();
      c.translate(lockupBox.x, lockupBox.y);
      c.scale(scale, scale);
      c.translate(-171, -282);
      c.fillStyle = WHITE;
      c.fill(letterPath, 'evenodd');
      c.fillStyle = LOGO_BLUE;
      c.fill(mountainPath, 'evenodd');
      c.restore();
    };

    /** The headline, in the exact box the DOM headline occupies. */
    const paintHeadline = (c: CanvasRenderingContext2D) => {
      const rect = headline.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const left = rect.left - hostRect.left;
      const top = rect.top - hostRect.top;
      const lines = Array.from(headline.children) as HTMLElement[];
      c.fillStyle = WHITE;
      c.textBaseline = 'alphabetic';
      const fontPx = parseFloat(headlineStyle.fontSize) || 48;
      const lineHeight = parseFloat(headlineStyle.lineHeight) || fontPx * 0.92;
      c.font = headlineFont;
      lines.forEach((line, index) => {
        // Line two is painted in flat blue purely as a key: on pairing those
        // points alternate blue and violet so the settled field reads as the
        // gradient.
        c.fillStyle = index === 1 ? BLUE : WHITE;
        const y = top + lineHeight * index + fontPx * 0.78;
        c.fillText(line.textContent || '', left, y);
      });
      if (lines.length === 0) {
        c.fillStyle = WHITE;
        c.fillText(headline.textContent || '', left, top + fontPx * 0.78);
      }
    };

    const group = (list: Particle[], key: (p: Particle) => string) => {
      const map = new Map<string, Particle[]>();
      for (const p of list) {
        const k = key(p);
        const bucket = map.get(k);
        if (bucket) bucket.push(p);
        else map.set(k, [p]);
      }
      return map;
    };

    const build = () => {
      // The logo is sampled finer than the headline so the field is dense enough
      // to read as text once it settles.
      const source = sample(paintLockup, Math.max(1, step - 1));
      const targets = sample(paintHeadline);
      // Even thinning so both fields stay under the cap and stay legible.
      const thin = <T,>(list: T[], limit: number): T[] => {
        if (list.length <= limit) return list;
        const keep: T[] = [];
        const stride = list.length / limit;
        for (let i = 0; i < limit; i += 1) keep.push(list[Math.floor(i * stride)]);
        return keep;
      };
      // Both fields are thinned to the same count and sorted into grid cells,
      // then paired index by index. That is a linear pass after the sort, so
      // there is no nearest neighbour loop, and every particle ends on a real
      // headline pixel.
      const cell = 12;
      const order = (pt: { x: number; y: number }) => Math.floor(pt.y / cell) * 10000 + Math.floor(pt.x / cell);
      const count = Math.min(source.length, targets.length, cap);
      const src = thin(source, count).sort((m, n) => order(m) - order(n));
      const tgt = thin(targets, count).sort((m, n) => order(m) - order(n));

      particles = src.map((p, index) => {
        const claim = tgt[index];
        const angle = Math.atan2(p.y - height / 2, p.x - width / 2) + (Math.random() - 0.5) * 0.6;
        const reach = Math.max(width, height) * (0.28 + Math.random() * 0.42);
        return {
          sx: p.x,
          sy: p.y,
          scolor: p.color === MOUNTAIN_KEY ? LOGO_BLUE : WHITE,
          bx: p.x + Math.cos(angle) * reach,
          by: p.y + Math.sin(angle) * reach,
          tx: claim ? claim.x : null,
          ty: claim ? claim.y : null,
          color: claim
            ? claim.color === LINE_TWO_KEY
              ? index % 2 === 0
                ? BLUE
                : VIOLET
              : WHITE
            : WHITE,
          wx: 0.6 + Math.random() * 0.8,
          wy: -120 + Math.random() * 240,
          seed: Math.random() * Math.PI * 2,
        };
      });

      sourceGroups = group(particles, (p) => p.scolor);
      targetGroups = group(particles, (p) => p.color);

      // The living field: a sparse subset of the settled headline pixels.
      const landed = particles.filter((p) => p.tx !== null && p.ty !== null);
      const livingCount = Math.min(landed.length, phone ? LIVING_PHONE : LIVING_DESKTOP);
      const stride = landed.length / Math.max(1, livingCount);
      living = [];
      for (let i = 0; i < livingCount; i += 1) {
        const p = landed[Math.floor(i * stride)];
        living.push({
          x: p.tx as number,
          y: p.ty as number,
          color: i % 3 === 0 ? VIOLET : WHITE,
          alpha: 0.1 + (i % 5) * 0.01,
          seed: Math.random() * Math.PI * 2,
          amp: 1 + Math.random(),
          ox: 0,
          oy: 0,
        });
      }
    };

    const paintField = (
      groups: Map<string, Particle[]>,
      positions: (p: Particle) => { x: number; y: number; a: number } | null
    ) => {
      ctx.clearRect(0, 0, width, height);
      groups.forEach((list, colour) => {
        ctx.fillStyle = colour;
        let alpha = -1;
        for (const p of list) {
          const at = positions(p);
          if (!at) continue;
          if (at.a !== alpha) {
            alpha = at.a;
            ctx.globalAlpha = alpha;
          }
          ctx.fillRect(at.x, at.y, step - 1, step - 1);
        }
      });
      ctx.globalAlpha = 1;
    };

    const settle = () => {
      if (settled) return;
      settled = true;
      showHeadline(true);
      fadeHeadline(1);
      onSettled?.();
    };

    const drawOpening = (now: number) => {
      const t = now - start;
      if (t < DRAW_END) {
        // The logo draws in behind a clip that opens from the base and from the
        // left at the same time, so the mountain fills as the letters arrive.
        ctx.clearRect(0, 0, width, height);
        const p = Math.min(1, t / T_DRAW);
        const eased = easeOut(p);
        ctx.save();
        ctx.globalAlpha = Math.min(1, p * 1.6);
        ctx.translate(0, (1 - eased) * 12);
        ctx.beginPath();
        ctx.rect(lockupBox.x, lockupBox.y + lockupBox.h * (1 - eased), lockupBox.w, lockupBox.h * eased + 2);
        ctx.rect(lockupBox.x, lockupBox.y, lockupBox.w * eased, lockupBox.h);
        ctx.clip();
        paintLockup(ctx);
        ctx.restore();
        return;
      }
      if (t < BURST_END) {
        const p = spring(Math.min(1, (t - DRAW_END) / T_BURST));
        const spin = p * 0.12;
        const cos = Math.cos(spin);
        const sin = Math.sin(spin);
        paintField(sourceGroups, (particle) => {
          const x = particle.sx + (particle.bx - particle.sx) * p - width / 2;
          const y = particle.sy + (particle.by - particle.sy) * p - height / 2;
          return { x: width / 2 + x * cos - y * sin, y: height / 2 + x * sin + y * cos, a: 1 };
        });
        return;
      }
      if (t < FORM_END) {
        const p = spring(Math.min(1, (t - BURST_END) / T_FORM));
        paintField(targetGroups, (particle) => {
          if (particle.tx === null || particle.ty === null) {
            // An ember with nowhere to go drifts up and fades out.
            return { x: particle.bx, y: particle.by - p * 160, a: Math.max(0, 1 - p) };
          }
          return {
            x: particle.bx + (particle.tx - particle.bx) * p,
            y: particle.by + (particle.ty - particle.by) * p,
            a: 1,
          };
        });
        return;
      }
      const fade = easeOut(Math.min(1, (t - FORM_END) / T_CROSS));
      if (fade > 0) showHeadline(true);
      paintField(targetGroups, (particle) =>
        particle.tx === null ? null : { x: particle.tx, y: particle.ty as number, a: 1 - fade }
      );
      if (fade >= 1) {
        ctx.clearRect(0, 0, width, height);
        settle();
      }
    };

    /** Pointer or touch position in canvas space, or null. */
    let touchX = -1;
    let touchY = -1;
    let lastNow = 0;

    /** The living headline: never quite still, and it answers a finger. */
    const drawLiving = (now: number) => {
      const delta = lastNow ? Math.min(64, now - lastNow) : 16;
      lastNow = now;
      const decay = Math.pow(0.001, delta / PUSH_RETURN);
      ctx.clearRect(0, 0, width, height);
      let colour = '';
      for (const p of living) {
        if (touchX >= 0) {
          const dx = p.x - touchX;
          const dy = p.y - touchY;
          const dist = Math.hypot(dx, dy);
          if (dist < PUSH_RADIUS && dist > 0.01) {
            const force = (1 - dist / PUSH_RADIUS) * 26;
            p.ox = (dx / dist) * force;
            p.oy = (dy / dist) * force;
          }
        }
        p.ox *= decay;
        p.oy *= decay;
        if (p.color !== colour) {
          colour = p.color;
          ctx.fillStyle = colour;
        }
        ctx.globalAlpha = p.alpha;
        const drift = Math.sin(now / 2600 + p.seed) * p.amp;
        ctx.fillRect(p.x + p.ox, p.y + drift + p.oy, 1, 1);
      }
      ctx.globalAlpha = 1;
    };

    /** The sweep: a pure function of scroll progress, and reversible. */
    const drawSweep = () => {
      const p = Math.min(1, Math.max(0, progressRef.current));
      const cross = Math.min(1, Math.max(0, (p - SWEEP_IN) / (SWEEP_FULL - SWEEP_IN)));
      fadeHeadline(1 - cross);
      if (cross <= 0) return false;
      const wind = Math.pow(p, 1.6) * width * 1.3;
      const alpha = Math.max(0, (1 - p * p) * cross);
      paintField(targetGroups, (particle) => {
        if (particle.tx === null || particle.ty === null) return null;
        return {
          x: particle.tx + wind * particle.wx,
          y: particle.ty + p * particle.wy + Math.sin(particle.seed + p * 6) * 8,
          a: alpha,
        };
      });
      return true;
    };

    const loop = (now: number) => {
      if (!settled) drawOpening(now);
      else if (!drawSweep()) drawLiving(now);
      frame = requestAnimationFrame(loop);
    };

    const jump = () => {
      if (jumped) return;
      jumped = true;
      settle();
      ctx.clearRect(0, 0, width, height);
    };

    const onResize = () => {
      size();
      build();
    };

    const boot = () => {
      size();
      build();
      showHeadline(false);
      start = performance.now();
      frame = requestAnimationFrame(loop);
    };

    let cancelled = false;
    const fonts = Promise.all([
      document.fonts?.load("800 64px 'Archivo'"),
      document.fonts?.load("400 16px 'Archivo'"),
    ]).catch(() => undefined);
    Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, FONT_TIMEOUT))]).then(() => {
      if (!cancelled) boot();
    });

    const onHidden = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else frame = requestAnimationFrame(loop);
    };
    const track = (event: PointerEvent | TouchEvent) => {
      const rect = host.getBoundingClientRect();
      const point = 'touches' in event ? event.touches[0] : event;
      if (!point) return;
      touchX = point.clientX - rect.left;
      touchY = point.clientY - rect.top;
    };
    const untrack = () => {
      touchX = -1;
      touchY = -1;
    };
    window.addEventListener('pointerdown', jump, { passive: true });
    window.addEventListener('keydown', jump);
    window.addEventListener('wheel', jump, { passive: true });
    window.addEventListener('touchstart', jump, { passive: true });
    window.addEventListener('pointermove', track, { passive: true });
    window.addEventListener('touchmove', track, { passive: true });
    window.addEventListener('pointerleave', untrack);
    window.addEventListener('touchend', untrack);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      headline.style.opacity = '';
      window.removeEventListener('pointerdown', jump);
      window.removeEventListener('keydown', jump);
      window.removeEventListener('wheel', jump);
      window.removeEventListener('touchstart', jump);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('touchmove', track);
      window.removeEventListener('pointerleave', untrack);
      window.removeEventListener('touchend', untrack);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [headlineRef, onHeadlineVisible, onSettled]);

  return (
    <div className="logo-burst" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

export const LogoBurst = memo(LogoBurstBase);
export default LogoBurst;
