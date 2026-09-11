import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LETTERS_PATH, LOGO_ASPECT, LOGO_BLUE, LOGO_VIEWBOX, MOUNTAIN_PATH } from './logoPaths';

/**
 * Pass 184 - the logo, centred, and the opening it now carries.
 *
 * On every load of the cover the real logo builds itself out of flying chunks:
 * the traced logo is sampled into small squares, every square starts scattered
 * beyond the edges of the screen, and they fly in and lock into place over
 * 1,600ms. The mountain assembles first and the letters follow, each chunk
 * arriving with a short settle, and when the last one lands the real SVG
 * crossfades in on top so the settled logo is the DOM logo.
 *
 * From there the scroll drives it. Over the first 55 percent of the first
 * viewport a blue to violet gradient rises through the letters, a soft glow
 * grows behind them, and the chunk field vibrates a single pixel once the fill
 * passes 40 percent. At 55 percent the logo bursts: the chunks explode outward
 * with the spring token while a white circle swells from the logo centre until
 * it covers the screen, and the cover hands over to the light world. Scrolling
 * back reverses every step of it.
 *
 * Everything here is transform and opacity work on one canvas plus two DOM
 * layers whose clip and opacity are written straight to the node, never through
 * state, so a scroll never re-renders React. The device pixel ratio is capped at
 * 1.5 and the loop stops while the tab is hidden. Under prefers-reduced-motion
 * the logo simply renders and the world crossfades at the same scroll point.
 */

/** The assembly. */
const ASSEMBLE = 1600;
const CROSSFADE = 200;
const TRAVEL = 300;
const SETTLE = 80;
const MOUNTAIN_WINDOW = 900;
const LETTER_START = 300;

/** The scroll driven half. */
export const BURST_AT = 0.55;
const VIBRATE_AT = 0.4;
const BURST = 700;
const BURST_FADE = 300;
const SWELL = 900;
const REVERSE = 500;

const WHITE = '#FFFFFF';
const MOUNTAIN_KEY = 'rgb(0,78,253)';

/** The logo box, as a share of the hero width. */
const LOGO_WIDTH_PHONE = 0.84;
const LOGO_WIDTH_DESKTOP = 0.48;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** The spring token, as a function. Lives only inside the burst. */
function spring(t: number): number {
  const c = 1.70158 + 1;
  const p = t - 1;
  return 1 + c * p * p * p + 1.70158 * p * p;
}

interface Chunk {
  /** Resting place, on the real logo. */
  x: number;
  y: number;
  /** Where it flies in from, beyond the edges. */
  fx: number;
  fy: number;
  /** Unit direction away from the logo centre, for the burst. */
  dx: number;
  dy: number;
  reach: number;
  size: number;
  colour: string;
  delay: number;
  seed: number;
}

export interface CoverLogoProps {
  /** Scroll progress over the first viewport, 0 to 1. */
  progress: number;
  /** Called with true once the white has covered the screen, false on reverse. */
  onWorldLight: (light: boolean) => void;
  /** Called when the assembly has finished and the DOM logo is on top. */
  onSettled?: () => void;
}

export function shouldRunOpening(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CoverLogoBase({ progress, onWorldLight, onSettled }: CoverLogoProps) {
  const reduced = useRef(!shouldRunOpening()).current;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [logoOn, setLogoOn] = useState(reduced);
  const [swell, setSwell] = useState<'off' | 'out' | 'in'>('off');
  const worldRef = useRef(onWorldLight);
  worldRef.current = onWorldLight;
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  const setSwellCentre = useCallback(() => {
    const art = artRef.current;
    const host = hostRef.current;
    if (!art || !host) return;
    const rect = art.getBoundingClientRect();
    host.style.setProperty('--swell-x', `${Math.round(rect.left + rect.width / 2)}px`);
    host.style.setProperty('--swell-y', `${Math.round(rect.top + rect.height / 2)}px`);
  }, []);

  // Under reduced motion there is no assembly and no burst: the logo is simply
  // there, and the world crossfades at the same scroll point.
  useEffect(() => {
    if (!reduced) return;
    worldRef.current(progress >= BURST_AT);
  }, [reduced, progress]);

  useEffect(() => {
    if (reduced) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const art = artRef.current;
    if (!host || !canvas || !art) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const phone = window.innerWidth < 700;
    const step = phone ? 3 : 2;
    const cap = phone ? 2400 : 7000;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const letterPath = new Path2D(LETTERS_PATH);
    const mountainPath = new Path2D(MOUNTAIN_PATH);

    let width = 0;
    let height = 0;
    let chunks: Chunk[] = [];
    let groups = new Map<string, Chunk[]>();
    let centreX = 0;
    let centreY = 0;

    const size = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** The logo, painted where the DOM logo actually sits, so they line up. */
    const paintLogo = (c: CanvasRenderingContext2D) => {
      const logoW = width * (phone ? LOGO_WIDTH_PHONE : LOGO_WIDTH_DESKTOP);
      const logoH = logoW / LOGO_ASPECT;
      const left = (width - logoW) / 2;
      const top = (height - logoH) / 2;
      centreX = left + logoW / 2;
      centreY = top + logoH / 2;
      const scale = logoW / 1625;
      c.save();
      c.translate(left, top);
      c.scale(scale, scale);
      c.translate(-171, -282);
      c.fillStyle = WHITE;
      c.fill(letterPath, 'evenodd');
      c.fillStyle = LOGO_BLUE;
      c.fill(mountainPath, 'evenodd');
      c.restore();
    };

    const build = () => {
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(width));
      off.height = Math.max(1, Math.round(height));
      const octx = off.getContext('2d');
      if (!octx) return;
      paintLogo(octx);
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const points: { x: number; y: number; blue: boolean }[] = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          const i = (y * off.width + x) * 4;
          if (data[i + 3] > 128) {
            points.push({ x, y, blue: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` === MOUNTAIN_KEY });
          }
        }
      }
      // Even thinning to the cap, so the field stays legible at any size.
      let kept = points;
      if (points.length > cap) {
        kept = [];
        const stride = points.length / cap;
        for (let i = 0; i < cap; i += 1) kept.push(points[Math.floor(i * stride)]);
      }

      const blue = kept.filter((p) => p.blue).sort((a, b) => a.x - b.x);
      const letters = kept.filter((p) => !p.blue).sort((a, b) => a.x - b.x);
      const reachMax = Math.max(width, height);

      const make = (list: typeof kept, start: number, span: number, colour: string): Chunk[] =>
        list.map((p, index) => {
          const frac = list.length > 1 ? index / (list.length - 1) : 0;
          const angle = Math.random() * Math.PI * 2;
          const away = reachMax * (0.9 + Math.random() * 0.8);
          const dirX = p.x - centreX;
          const dirY = p.y - centreY;
          const len = Math.max(1, Math.hypot(dirX, dirY));
          return {
            x: p.x,
            y: p.y,
            fx: p.x + Math.cos(angle) * away,
            fy: p.y + Math.sin(angle) * away,
            dx: dirX / len,
            dy: dirY / len,
            reach: reachMax * (0.3 + Math.random() * 0.5),
            size: 2 + (index % 3),
            colour,
            delay: start + frac * span,
            seed: Math.random() * Math.PI * 2,
          };
        });

      chunks = [
        ...make(blue, 0, Math.max(0, MOUNTAIN_WINDOW - TRAVEL - SETTLE), LOGO_BLUE),
        ...make(letters, LETTER_START, Math.max(0, ASSEMBLE - LETTER_START - TRAVEL - SETTLE), WHITE),
      ];
      groups = new Map<string, Chunk[]>();
      for (const c of chunks) {
        const bucket = groups.get(c.colour);
        if (bucket) bucket.push(c);
        else groups.set(c.colour, [c]);
      }
      host.dataset.chunks = `${letters.length} white, ${blue.length} blue`;
    };

    const clear = () => ctx.clearRect(0, 0, width, height);

    /** One pass over the field, grouped by colour so the fill is set twice. */
    const paint = (at: (c: Chunk) => { x: number; y: number; a: number } | null) => {
      clear();
      groups.forEach((list, colour) => {
        ctx.fillStyle = colour;
        let alpha = -1;
        for (const c of list) {
          const spot = at(c);
          if (!spot) continue;
          if (spot.a !== alpha) {
            alpha = spot.a;
            ctx.globalAlpha = alpha;
          }
          ctx.fillRect(spot.x, spot.y, c.size, c.size);
        }
      });
      ctx.globalAlpha = 1;
    };

    /** The fill and the glow are written straight to the two DOM layers. */
    const writeFill = (level: number) => {
      const top = Math.round((1 - level) * 1000) / 10;
      if (fillRef.current) fillRef.current.style.clipPath = `inset(${top}% 0 0 0)`;
      if (glowRef.current) glowRef.current.style.opacity = String(Math.round(level * 12) / 100);
    };

    type Phase = 'assemble' | 'crossfade' | 'ready' | 'burst' | 'light' | 'reverse';
    let phase: Phase = 'assemble';
    let start = performance.now();
    let mark = 0;
    let jumped = false;
    let frame = 0;

    const toReady = () => {
      phase = 'ready';
      clear();
      setLogoOn(true);
      settledRef.current?.();
    };

    const drawAssembly = (t: number) => {
      paint((c) => {
        const local = t - c.delay;
        if (local <= 0) return { x: c.fx, y: c.fy, a: 1 };
        if (local >= TRAVEL + SETTLE) return { x: c.x, y: c.y, a: 1 };
        if (local < TRAVEL) {
          const k = easeOut(local / TRAVEL);
          // A small overshoot outward, which the settle then takes back.
          const over = 3 * k;
          return {
            x: c.fx + (c.x - c.fx) * k + c.dx * over,
            y: c.fy + (c.y - c.fy) * k + c.dy * over,
            a: 1,
          };
        }
        const s = (local - TRAVEL) / SETTLE;
        const damp = (1 - s) * 3;
        return { x: c.x + c.dx * damp, y: c.y + c.dy * damp, a: 1 };
      });
    };

    const drawBurst = (t: number) => {
      const k = spring(Math.min(1, t / BURST));
      const fade = t <= BURST - BURST_FADE ? 1 : Math.max(0, 1 - (t - (BURST - BURST_FADE)) / BURST_FADE);
      const alpha = Math.round(fade * 100) / 100;
      paint((c) => ({ x: c.x + c.dx * c.reach * k, y: c.y + c.dy * c.reach * k, a: alpha }));
    };

    const drawReassemble = (k: number) => {
      const eased = easeOut(Math.min(1, k));
      paint((c) => ({
        x: c.x + c.dx * c.reach * (1 - eased),
        y: c.y + c.dy * c.reach * (1 - eased),
        a: Math.round(eased * 100) / 100,
      }));
    };

    const drawVibrate = (now: number) => {
      paint((c) => ({
        x: c.x + Math.sin(now / 70 + c.seed),
        y: c.y + Math.cos(now / 90 + c.seed),
        a: 0.22,
      }));
    };

    const loop = (now: number) => {
      const p = Math.min(1, Math.max(0, progressRef.current));

      if (phase === 'assemble') {
        const t = now - start;
        drawAssembly(t);
        if (t >= ASSEMBLE) {
          phase = 'crossfade';
          mark = now;
          setLogoOn(true);
        }
      } else if (phase === 'crossfade') {
        const t = now - mark;
        const alpha = Math.max(0, 1 - t / CROSSFADE);
        paint((c) => ({ x: c.x, y: c.y, a: Math.round(alpha * 100) / 100 }));
        if (t >= CROSSFADE) toReady();
      } else if (phase === 'ready') {
        writeFill(Math.min(1, p / BURST_AT));
        if (p >= VIBRATE_AT && p < BURST_AT) drawVibrate(now);
        else clear();
        if (p >= BURST_AT) {
          phase = 'burst';
          mark = now;
          setSwellCentre();
          setLogoOn(false);
          setSwell('out');
        }
      } else if (phase === 'burst') {
        const t = now - mark;
        drawBurst(t);
        if (t >= SWELL) {
          phase = 'light';
          clear();
          if (glowRef.current) glowRef.current.style.opacity = '0';
          setSwell('off');
          worldRef.current(true);
        }
      } else if (phase === 'light') {
        if (p < BURST_AT) {
          phase = 'reverse';
          mark = now;
          setSwellCentre();
          setSwell('in');
          worldRef.current(false);
        }
      } else if (phase === 'reverse') {
        const t = now - mark;
        drawReassemble(t / REVERSE);
        writeFill(Math.min(1, p / BURST_AT));
        if (t >= REVERSE) {
          setSwell('off');
          toReady();
        }
      }

      frame = requestAnimationFrame(loop);
    };

    /** Any input jumps the assembly to the settled state. */
    const jump = () => {
      if (jumped || phase !== 'assemble') return;
      jumped = true;
      phase = 'ready';
      clear();
      setLogoOn(true);
      settledRef.current?.();
    };

    const onResize = () => {
      size();
      build();
    };

    size();
    build();
    writeFill(0);
    frame = requestAnimationFrame(loop);

    const onHidden = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else frame = requestAnimationFrame(loop);
    };

    window.addEventListener('pointerdown', jump, { passive: true });
    window.addEventListener('keydown', jump);
    window.addEventListener('touchstart', jump, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', jump);
      window.removeEventListener('keydown', jump);
      window.removeEventListener('touchstart', jump);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [reduced, setSwellCentre]);

  const logo = (gradient: boolean) => (
    <svg viewBox={LOGO_VIEWBOX} width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      {gradient && (
        <defs>
          <linearGradient id="cover-logo-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={LOGO_BLUE} />
            <stop offset="1" stopColor="#B69CFF" />
          </linearGradient>
        </defs>
      )}
      <path d={LETTERS_PATH} fillRule="evenodd" fill={gradient ? 'url(#cover-logo-fill)' : 'var(--wordmark-letters, #FFFFFF)'} />
      {!gradient && <path d={MOUNTAIN_PATH} fillRule="evenodd" fill={LOGO_BLUE} />}
    </svg>
  );

  return (
    <div className="cover-logo" ref={hostRef}>
      <div className="cover-logo-glow" ref={glowRef} aria-hidden="true" />
      <div className="cover-logo-art" ref={artRef} data-on={logoOn ? 'true' : 'false'}>
        <span className="sr-only">TRNTY, Trinity Sales</span>
        {logo(false)}
        <div className="cover-logo-fill" ref={fillRef} aria-hidden="true">
          {logo(true)}
        </div>
      </div>
      {!reduced && <canvas ref={canvasRef} aria-hidden="true" />}
      {swell !== 'off' && <div className="cover-swell" data-state={swell} aria-hidden="true" />}
    </div>
  );
}

export const CoverLogo = memo(CoverLogoBase);
export default CoverLogo;
