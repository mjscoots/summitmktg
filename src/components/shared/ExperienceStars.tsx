import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { experienceLabel, experienceStars } from '@/lib/experience';

/**
 * Half a star per year in the industry, capped at four, with the tier wording
 * available as the accessible label. Nothing renders when no years are on file.
 */
export function ExperienceStars({
  years,
  showLabel = false,
  className,
}: {
  years: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}) {
  const label = experienceLabel(years);
  if (!label) return null;

  const total = experienceStars(years);
  const full = Math.floor(total);
  const half = total - full >= 0.5;

  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1', className)}
      title={label}
      aria-label={label}
    >
      <span className="inline-flex items-center gap-[1px]">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
        ))}
        {half && <StarHalf className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />}
      </span>
      {showLabel && <span className="text-[11px] text-muted-foreground">{label}</span>}
    </span>
  );
}
