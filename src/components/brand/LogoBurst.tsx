import { memo, useEffect, useRef } from 'react';

/**
 * Pass 181 - the opening and the sweep. Cover only.
 *
 * On every load of the cover TRNTY alone draws itself huge and
 * centred in the hero, holds, shatters into thousands of pieces, and those
 * pieces are pulled into the shape of the real two line headline before the DOM
 * headline crossfades in on top. After that the same particle field answers scroll: the
 * headline tears off the right edge of the page and reassembles on the way back.
 *
 * Pass 182 removes the once per session gate, so the opening runs on every load
 * of the cover. The settled hero is always the real DOM text, so it stays
 * selectable and readable by a screen reader. Under prefers-reduced-motion this
 * component renders nothing and the hero is settled from the first frame, and
 * any input jumps straight to the settled state.
 *
 * Everything drawn here is transform and opacity work on a canvas: no layout
 * property is ever animated.
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

/** The second headline line settles as the gradient: blue into violet. */
const BLUE = '#3A8DFF';
const VIOLET = '#B69CFF';
/** Painted into the target sample so line two can be recoloured on pairing. */
const LINE_TWO_KEY = 'rgb(58,141,255)';

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
  /** Start (the sampled lockup pixel). */
  sx: number;
  sy: number;
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

    let width = host.clientWidth;
    let height = host.clientHeight;
    let particles: Particle[] = [];
    let byColour = new Map<string, Particle[]>();
    let settled = false;
    let jumped = false;
    let frame = 0;
    let start = 0;
    let lockupBox = { x: 0, y: 0, w: 0, h: 0 };
    let headlineShown = true;
    const showHeadline = (visible: boolean) => {
      if (visible === headlineShown) return;
      headlineShown = visible;
      onHeadlineVisible?.(visible);
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
    const letterColour = '#FFFFFF';
    const headlineFont = `${headlineStyle.fontWeight} ${headlineStyle.fontSize} ${headlineStyle.fontFamily}`;

    /**
     * TRNTY alone, centred, at clamp(4rem, 22vw, 14rem) so it fills a phone
     * screen. No mark: the letters and the peak never appear side by side.
     */
    const paintLockup = (c: CanvasRenderingContext2D) => {
      const fontSize = Math.max(64, Math.min(224, width * 0.22));
      c.font = `800 ${fontSize}px 'Archivo', system-ui, sans-serif`;
      c.textBaseline = 'alphabetic';
      const text = 'TRNTY';
      const tracking = fontSize * 0.04;
      let textWidth = 0;
      for (const ch of text) textWidth += c.measureText(ch).width + tracking;
      const left = (width - textWidth) / 2;
      const baseline = height / 2 + fontSize * 0.36;
      lockupBox = { x: left, y: baseline - fontSize, w: textWidth, h: fontSize * 1.2 };

      c.fillStyle = letterColour;
      let x = left;
      for (const ch of text) {
        c.fillText(ch, x, baseline);
        x += c.measureText(ch).width + tracking;
      }
    };

    /** The headline, in the exact box the DOM headline occupies. */
    const paintHeadline = (c: CanvasRenderingContext2D) => {
      const rect = headline.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const left = rect.left - hostRect.left;
      const top = rect.top - hostRect.top;
      const lines = Array.from(headline.children) as HTMLElement[];
      c.fillStyle = letterColour;
      c.textBaseline = 'alphabetic';
      const fontPx = parseFloat(headlineStyle.fontSize) || 48;
      const lineHeight = (parseFloat(headlineStyle.lineHeight) || fontPx * 0.92);
      c.font = headlineFont;
      lines.forEach((line, index) => {
        // Line two is painted in flat blue purely as a key: on pairing those
        // points alternate blue and violet so the settled field reads as the
        // gradient.
        c.fillStyle = index === 1 ? BLUE : letterColour;
        const y = top + lineHeight * index + fontPx * 0.78;
        c.fillText(line.textContent || '', left, y);
      });
      if (lines.length === 0) {
        c.fillStyle = letterColour;
        c.fillText(headline.textContent || '', left, top + fontPx * 0.78);
      }
    };

    const build = () => {
      // The lockup is sampled finer than the headline so the field is dense
      // enough to read as text once it settles.
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
      // there is no O(n squared) nearest neighbour loop, and every particle
      // ends on a real headline pixel.
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
          bx: p.x + Math.cos(angle) * reach,
          by: p.y + Math.sin(angle) * reach,
          tx: claim ? claim.x : null,
          ty: claim ? claim.y : null,
          color: claim
            ? claim.color === LINE_TWO_KEY
              ? index % 2 === 0
                ? BLUE
                : VIOLET
              : letterColour
            : letterColour,
          wx: 0.6 + Math.random() * 0.8,
          wy: -120 + Math.random() * 240,
          seed: Math.random() * Math.PI * 2,
        };
      });

      byColour = new Map();
      for (const p of particles) {
        const list = byColour.get(p.color);
        if (list) list.push(p);
        else byColour.set(p.color, [p]);
      }
    };

    const paintField = (positions: (p: Particle) => { x: number; y: number; a: number } | null) => {
      ctx.clearRect(0, 0, width, height);
      byColour.forEach((list, colour) => {
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
      onSettled?.();
    };

    const drawOpening = (now: number) => {
      const t = now - start;
      if (t < DRAW_END) {
        // The lockup draws in: the mark fills from base to peak, the letters
        // rise and fade in behind a clip that opens left to right.
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
        paintField((particle) => {
          const x = particle.sx + (particle.bx - particle.sx) * p - width / 2;
          const y = particle.sy + (particle.by - particle.sy) * p - height / 2;
          return { x: width / 2 + x * cos - y * sin, y: height / 2 + x * sin + y * cos, a: 1 };
        });
        return;
      }
      if (t < FORM_END) {
        const p = spring(Math.min(1, (t - BURST_END) / T_FORM));
        paintField((particle) => {
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
      const fade = Math.min(1, (t - FORM_END) / T_CROSS);
      if (fade > 0) showHeadline(true);
      paintField((particle) => (particle.tx === null ? null : { x: particle.tx, y: particle.ty as number, a: 1 - fade }));
      if (fade >= 1) {
        ctx.clearRect(0, 0, width, height);
        settle();
      }
    };

    /** The sweep: a pure function of scroll progress. */
    const drawSweep = () => {
      const p = Math.min(1, Math.max(0, progressRef.current));
      if (p <= 0.05) {
        if (!headlineShown) {
          showHeadline(true);
          ctx.clearRect(0, 0, width, height);
        }
        return;
      }
      showHeadline(false);
      const wind = Math.pow(p, 1.6) * width * 1.3;
      const alpha = Math.max(0, 1 - p * p);
      paintField((particle) => {
        if (particle.tx === null || particle.ty === null) return null;
        return {
          x: particle.tx + wind * particle.wx,
          y: particle.ty + p * particle.wy + Math.sin(particle.seed + p * 6) * 8,
          a: alpha,
        };
      });
    };

    const loop = (now: number) => {
      if (!settled) drawOpening(now);
      else drawSweep();
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
    window.addEventListener('pointerdown', jump, { passive: true });
    window.addEventListener('keydown', jump);
    window.addEventListener('wheel', jump, { passive: true });
    window.addEventListener('touchstart', jump, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', jump);
      window.removeEventListener('keydown', jump);
      window.removeEventListener('wheel', jump);
      window.removeEventListener('touchstart', jump);
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
