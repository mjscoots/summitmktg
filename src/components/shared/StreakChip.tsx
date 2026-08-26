import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakChipProps {
  /** Consecutive days with a logged sale or install. */
  days: number;
  label?: string;
  className?: string;
}

/**
 * Shows a consecutive-day streak from two days up. Below two days there is
 * nothing to say, so nothing is shown.
 */
export function StreakChip({ days, label = 'day streak', className }: StreakChipProps) {
  if (!days || days < 2) return null;
  return (
    <span className={cn('streak-chip', className)}>
      <Flame className="h-3.5 w-3.5" strokeWidth={2} />
      {days} {label}
    </span>
  );
}
