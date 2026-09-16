import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LETTERS_PATH, LOGO_BLUE, LOGO_VIEWBOX, MOUNTAIN_PATH } from './logoPaths';

const VIEW_X = 171;
const VIEW_Y = 282;
const VIEW_W = 1625;
const VIEW_H = 281;
const FILL_END = 0.66;
const FILL_FEATHER = VIEW_H * 0.06;
export const BURST_AT = 0.72;

type Phase = 'assemble' | 'ready' | 'burst' | 'light' | 'reverse';

interface Shard {
  points: string;
  mountain: boolean;
  delay: number;
  fromX: string;
  fromY: string;
  burstX: string;
  burstY: string;
  rotation: number;
  duration: number;
}

export interface CoverLogoProps {
  progress: number;
  onBurst: (active: boolean) => void;
  onWorldLight: (light: boolean) => void;
}

export function shouldRunOpening(): boolean {
  return typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 91.17 + salt * 47.31) * 43758.5453;
  return value - Math.floor(value);
}

function makeShards(count: 28 | 56): Shard[] {
  const columns = count === 28 ? 7 : 8;
  const rows = count / columns;
  const cellW = VIEW_W / columns;
  const cellH = VIEW_H / rows;
  const vertices: { x: number; y: number }[][] = [];

  for (let row = 0; row <= rows; row += 1) {
    vertices[row] = [];
    for (let column = 0; column <= columns; column += 1) {
      const edgeX = column === 0 || column === columns;
      const edgeY = row === 0 || row === rows;
      vertices[row][column] = {
        x: VIEW_X + column * cellW + (edgeX ? 0 : (seeded(row * 20 + column, 1) - 0.5) * cellW * 0.24),
        y: VIEW_Y + row * cellH + (edgeY ? 0 : (seeded(row * 20 + column, 2) - 0.5) * cellH * 0.34),
      };
    }
  }

  const shards: Shard[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const a = vertices[row][column];
      const b = vertices[row][column + 1];
      const c = vertices[row + 1][column + 1];
      const d = vertices[row + 1][column];
      const centreX = (a.x + b.x + c.x + d.x) / 4;
      const centreY = (a.y + b.y + c.y + d.y) / 4;
      const mountain = centreX > 690 && centreX < 1282;
      const third = centreX < VIEW_X + VIEW_W / 3 ? 'left' : centreX > VIEW_X + (VIEW_W * 2) / 3 ? 'right' : 'middle';
      const vertical = row % 2 === 0 ? -1 : 1;
      const angle = Math.atan2(centreY - (VIEW_Y + VIEW_H / 2), centreX - (VIEW_X + VIEW_W / 2));
      const delay = mountain
        ? Math.round((index / Math.max(1, count - 1)) * 80)
        : Math.round(250 + (centreX - VIEW_X) / VIEW_W * 250);
      shards.push({
        points: `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`,
        mountain,
        delay,
        fromX: third === 'left' ? '-115vw' : third === 'right' ? '115vw' : `${(seeded(index, 4) - 0.5) * 24}vw`,
        fromY: third === 'middle' ? `${vertical * 105}vh` : `${(seeded(index, 5) - 0.5) * 80}vh`,
        burstX: `${Math.cos(angle) * (65 + seeded(index, 6) * 35)}vw`,
        burstY: `${Math.sin(angle) * (65 + seeded(index, 7) * 35)}vh`,
        rotation: (8 + seeded(index, 8) * 12) * (index % 2 === 0 ? -1 : 1),
        duration: mountain ? 620 : 900,
      });
    }
  }
  return shards;
}

function CoverLogoBase({ progress, onBurst, onWorldLight }: CoverLogoProps) {
  const logoRef = useRef<HTMLDivElement | null>(null);
  const reduced = useRef(!shouldRunOpening()).current;
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 700);
  const [phase, setPhase] = useState<Phase>(reduced ? 'ready' : 'assemble');
  const id = useId().replace(/:/g, '');
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>(reduced ? 'ready' : 'assemble');
  const previousProgress = useRef(progress);
  const shards = useMemo(() => makeShards(desktop ? 56 : 28), [desktop]);
  const fill = Math.min(1, Math.max(0, progress / FILL_END));
  const fillEdge = VIEW_Y + VIEW_H * (1 - fill);

  useEffect(() => {
    const resize = () => setDesktop(window.innerWidth >= 700);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const setCurrentPhase = (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
    };
    const settle = window.setTimeout(() => {
      if (phaseRef.current === 'assemble') setCurrentPhase('ready');
    }, 1400);
    const jump = () => {
      if (phaseRef.current === 'assemble') setCurrentPhase('ready');
    };
    window.addEventListener('pointerdown', jump, { passive: true });
    window.addEventListener('keydown', jump);
    window.addEventListener('touchstart', jump, { passive: true });
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('pointerdown', jump);
      window.removeEventListener('keydown', jump);
      window.removeEventListener('touchstart', jump);
    };
  }, [reduced]);

  useEffect(() => {
    const crossedDown = previousProgress.current < BURST_AT && progress >= BURST_AT;
    const crossedUp = previousProgress.current >= BURST_AT && progress < BURST_AT;
    previousProgress.current = progress;
    if (reduced) {
      onBurst(progress >= BURST_AT);
      onWorldLight(progress >= BURST_AT);
      const next = progress >= BURST_AT ? 'light' : 'ready';
      phaseRef.current = next;
      setPhase(next);
      return;
    }
    if (crossedDown) {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      phaseRef.current = 'burst';
      setPhase('burst');
      onBurst(true);
      timers.current.push(window.setTimeout(() => {
        onWorldLight(true);
        timers.current.push(window.setTimeout(() => {
          phaseRef.current = 'light';
          setPhase('light');
        }, 80));
      }, 620));
    } else if (crossedUp) {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      onBurst(false);
      onWorldLight(false);
      phaseRef.current = 'reverse';
      setPhase('reverse');
      timers.current.push(window.setTimeout(() => {
        phaseRef.current = 'ready';
        setPhase('ready');
      }, 620));
    }
  }, [onBurst, onWorldLight, progress, reduced]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    if (reduced) return;
    const node = logoRef.current;
    if (!node) return;
    let frame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    const draw = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      node.style.setProperty('--logo-drift-x', `${currentX.toFixed(2)}px`);
      node.style.setProperty('--logo-drift-y', `${currentY.toFixed(2)}px`);
      frame = requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 16;
      targetY = (event.clientY / window.innerHeight - 0.5) * -16;
    };
    const onOrient = (event: DeviceOrientationEvent) => {
      targetX = Math.max(-8, Math.min(8, (event.gamma || 0) / 3.75));
      targetY = Math.max(-8, Math.min(8, -((event.beta || 45) - 45) / 3.75));
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onOrient);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, [reduced]);

  return (
    <div
      ref={logoRef}
      className="cover-logo"
      data-phase={phase}
      data-shards={shards.length}
      data-fill-progress={fill.toFixed(4)}
      style={{ '--logo-fill': fill, '--logo-glow': fill * 0.12 } as React.CSSProperties}
    >
      <div className="cover-logo-glow" aria-hidden="true" />
      <svg className="cover-shard-logo" viewBox={LOGO_VIEWBOX} role="img" aria-label="TRNTY, Trinity Sales">
        <title>Trinity Sales</title>
        <defs>
          <linearGradient
            id={`${id}-fill-feather`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={fillEdge - FILL_FEATHER}
            x2="0"
            y2={fillEdge}
          >
            <stop offset="0" stopColor="#000000" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
          <mask id={`${id}-fill-mask`} maskUnits="userSpaceOnUse" x={VIEW_X} y={VIEW_Y} width={VIEW_W} height={VIEW_H}>
            <rect
              x={VIEW_X}
              y={VIEW_Y}
              width={VIEW_W}
              height={VIEW_H}
              fill={`url(#${id}-fill-feather)`}
              opacity={fill === 0 ? 0 : 1}
            />
          </mask>
          {shards.map((shard, index) => (
            <clipPath id={`${id}-shard-${index}`} key={`clip-${index}`}>
              <polygon points={shard.points} />
            </clipPath>
          ))}
        </defs>
        <g aria-hidden="true">
          {shards.map((shard, index) => (
            <g
              key={index}
              className="cover-shard"
              clipPath={`url(#${id}-shard-${index})`}
              data-mountain={shard.mountain ? 'true' : undefined}
              style={{
                '--shard-delay': `${shard.delay}ms`,
                '--from-x': shard.fromX,
                '--from-y': shard.fromY,
                '--burst-x': shard.burstX,
                '--burst-y': shard.burstY,
                '--shard-rotate': `${shard.rotation}deg`,
                '--shard-duration': `${shard.duration}ms`,
              } as React.CSSProperties}
            >
              <path d={LETTERS_PATH} fill="#FFFFFF" fillRule="evenodd" />
              <path d={MOUNTAIN_PATH} fill={LOGO_BLUE} fillRule="evenodd" />
              <g className="cover-shard-fill" mask={`url(#${id}-fill-mask)`}>
                <path className="cover-letter-fill" d={LETTERS_PATH} fill={LOGO_BLUE} fillRule="evenodd" />
                <path className="cover-mountain-fill" d={MOUNTAIN_PATH} fill="#FFFFFF" fillRule="evenodd" />
              </g>
            </g>
          ))}
        </g>
      </svg>
      {(phase === 'burst' || phase === 'reverse') && <div className="cover-swell" data-state={phase} aria-hidden="true" />}
    </div>
  );
}

export const CoverLogo = memo(CoverLogoBase);
export default CoverLogo;