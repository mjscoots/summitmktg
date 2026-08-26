import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/shared/CountUp';
import { GoalRing } from '@/components/home/GoalRing';

/** Shine plays once per browser session so Home stays calm on every reopen. */
function useOnceShine(key: string): boolean {
  const [shine, setShine] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      setShine(true);
    } catch {
      /* storage unavailable — no shine */
    }
  }, [key]);
  return shine;
}

/** A fourteen point line of daily counts. No axis, no labels. */
function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;
  const d = points
    .map((n, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(24 - (n / max) * 22).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-2 h-6 w-full" aria-hidden>
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface HeroProps {
  label: string;
  value: number;
  /** One quiet line under the number. */
  subline: string;
  /** Shown instead of the subline when nothing has happened yet. */
  zeroLine?: string;
  weekCount?: number;
  showRing?: boolean;
  sparkline?: number[];
  attention?: { count: number; onOpen: () => void } | null;
  action?: React.ReactNode;
  shineKey?: string;
  className?: string;
}

/** The one big number at the top of Home. */
export function HomeHero({
  label,
  value,
  subline,
  zeroLine,
  weekCount = 0,
  showRing = false,
  sparkline,
  attention,
  action,
  shineKey = 'home-hero-shine',
  className,
}: HeroProps) {
  const shine = useOnceShine(shineKey);

  return (
    <section className={cn('card-hero p-4', shine && 'shine', className)}>
      <div className="relative z-10 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="micro-label">{label}</p>
          <p className="mt-1 text-[56px] font-bold leading-none tracking-tight text-foreground">
            <CountUp value={value} />
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {value === 0 && zeroLine ? zeroLine : subline}
          </p>
        </div>
        {showRing && <GoalRing weekCount={weekCount} />}
      </div>

      {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} />}

      {attention && attention.count > 0 && (
        <button
          type="button"
          onClick={attention.onOpen}
          className="relative z-10 mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] font-semibold text-foreground"
        >
          <span className="tabular-nums">{attention.count}</span> need attention
        </button>
      )}

      {action && <div className="relative z-10 mt-3">{action}</div>}
    </section>
  );
}

export default HomeHero;
