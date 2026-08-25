import { useUserBadges } from '@/hooks/useBadges';
import { BadgeChip } from './BadgeChip';
import { cn } from '@/lib/utils';

/** Compact inline badges (chat rows, member lists). Caps to `max` to avoid crowding. */
export function BadgeStrip({
  userId,
  max = 3,
  size = 'xs',
  className,
}: {
  userId: string;
  max?: number;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const badges = useUserBadges(userId);
  if (!badges.length) return null;
  const shown = badges.slice(0, max);
  const extra = badges.length - shown.length;

  return (
    <span className={cn('inline-flex items-center gap-0.5 align-middle', className)}>
      {shown.map((b) => (
        <BadgeChip key={b.badge_key} badge={b} size={size} />
      ))}
      {extra > 0 && (
        <span className="text-[9px] font-semibold text-[#D4AF37]/70">+{extra}</span>
      )}
    </span>
  );
}

/** Full badge shelf for profiles / scorecards. */
export function BadgeShelf({ userId, className }: { userId: string; className?: string }) {
  const badges = useUserBadges(userId);
  if (!badges.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((b) => (
        <BadgeChip key={b.badge_key} badge={b} size="sm" showLabel />
      ))}
    </div>
  );
}
