import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStatusBadges } from '@/hooks/useStatusBadges';

/**
 * Small metal finish badge next to a name for anyone signed for 2027.
 * Display only. Renders nothing when the person is not locked in.
 */
export function LockedInBadge({
  userId,
  className,
  showLabel = false,
}: {
  userId?: string | null;
  className?: string;
  showLabel?: boolean;
}) {
  const badges = useStatusBadges(userId);
  if (!badges?.locked_in) return null;

  return (
    <span
      title="Locked in for 2027"
      aria-label="Locked in for 2027"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-gradient-to-b from-primary/25 to-primary/5 px-1.5 py-[1px] text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.35)]',
        className
      )}
    >
      <ShieldCheck className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">2027</span>
      )}
    </span>
  );
}
