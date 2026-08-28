import { cn } from '@/lib/utils';

/**
 * Pass 101 — training minutes this week for one rep. Zero minutes reads as a
 * warm chip, plain language, no shaming.
 */
export function TrainingWeekChip({ minutes, className }: { minutes: number; className?: string }) {
  const cold = minutes === 0;
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full text-[10px] font-semibold tabular-nums',
        cold ? 'chip-warm' : 'bg-primary/15 px-2 py-0.5 text-primary',
        className
      )}
    >
      {cold ? 'No training this week' : `${minutes}m trained`}

    </span>
  );
}

export default TrainingWeekChip;
