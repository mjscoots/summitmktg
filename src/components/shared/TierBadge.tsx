import { Shield, Award, Star, Mountain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const TIER_CONFIG = [
  { name: 'Bronze', threshold: 25, icon: Shield, color: 'text-foreground', border: 'ring-[hsl(var(--medal-bronze)/0.50)]', bg: 'bg-[hsl(var(--medal-bronze)/0.15)]' },
  { name: 'Silver', threshold: 50, icon: Award, color: 'text-foreground', border: 'ring-[hsl(var(--medal-silver)/0.50)]', bg: 'bg-[hsl(var(--medal-silver)/0.15)]' },
  { name: 'Gold', threshold: 75, icon: Star, color: 'text-foreground', border: 'ring-[hsl(var(--medal-gold)/0.50)]', bg: 'bg-[hsl(var(--medal-gold)/0.15)]' },
  { name: 'Trinity', threshold: 100, icon: Mountain, color: 'text-foreground', border: 'ring-primary/50', bg: 'bg-primary/15' },
] as const;

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Trinity' | null;

export function getTierForPercentage(pct: number): typeof TIER_CONFIG[number] | null {
  if (pct >= 100) return TIER_CONFIG[3];
  if (pct >= 75) return TIER_CONFIG[2];
  if (pct >= 50) return TIER_CONFIG[1];
  if (pct >= 25) return TIER_CONFIG[0];
  return null;
}

export function getTierBorderClass(pct: number): string {
  const tier = getTierForPercentage(pct);
  if (!tier) return '';
  return `ring-2 ${tier.border}`;
}

interface TierBadgeProps {
  percentage: number;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ percentage, size = 'sm', showLabel = false, className }: TierBadgeProps) {
  const tier = getTierForPercentage(percentage);
  if (!tier) return null;

  const Icon = tier.icon;

  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const badgeSizeClasses = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-1 rounded-full transition-all",
          badgeSizeClasses[size],
          tier.bg, tier.color,
          className
        )}>
          <Icon className={sizeClasses[size]} />
          {showLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider pr-1">
              {tier.name}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tier.name} Tier - {percentage}% complete
      </TooltipContent>
    </Tooltip>
  );
}
