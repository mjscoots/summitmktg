import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/** Displays a number with a short count-up animation. See useCountUp for details. */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 700, className }: CountUpProps) {
  const display = useCountUp(value, duration);
  return (
    <span className={cn('stat-num', className)}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}
