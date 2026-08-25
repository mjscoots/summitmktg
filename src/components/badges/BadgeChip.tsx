import { Award, Star, Users, Crown, Flame, Zap, ShieldCheck, Medal, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserBadge } from '@/hooks/useBadges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ICONS: Record<string, typeof Award> = {
  award: Award,
  star: Star,
  users: Users,
  crown: Crown,
  flame: Flame,
  zap: Zap,
  shield: ShieldCheck,
  medal: Medal,
  mic: Mic,
};

export function badgeIcon(icon: string) {
  return ICONS[icon] || Award;
}

/** Small gold-line badge icon. Used inline in chat and on profiles. */
export function BadgeChip({
  badge,
  size = 'sm',
  showLabel = false,
}: {
  badge: UserBadge;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}) {
  const Icon = badgeIcon(badge.icon);
  const dim = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  const body = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]',
        showLabel ? 'px-2 py-0.5' : size === 'xs' ? 'p-0.5' : 'p-1'
      )}
    >
      <Icon className={dim} strokeWidth={1.75} />
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-micro whitespace-nowrap">{badge.name}</span>
      )}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{body}</TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          <span className="font-semibold">{badge.name}</span>
          {badge.description && <span className="text-muted-foreground"> · {badge.description}</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
