import { cn } from '@/lib/utils';

/**
 * Tiny chips for the industries a person has been accepted into.
 *
 * In an industry room the room's own industry is skipped, since everyone there
 * already shares it. At most three chips render.
 */
export function IndustryChips({
  verticals,
  skip,
  max = 3,
  className,
}: {
  verticals: string[] | null | undefined;
  skip?: string | null;
  max?: number;
  className?: string;
}) {
  const list = (verticals || []).filter((v) => v && v !== skip).slice(0, max);
  if (!list.length) return null;

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {list.map((v) => (
        <span
          key={v}
          className="rounded-full border border-primary/25 bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
        >
          {v}
        </span>
      ))}
    </span>
  );
}
