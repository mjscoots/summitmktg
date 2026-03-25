import { Shield, Award, Star, Mountain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const TIER_CONFIG = [
  { name: 'Bronze', threshold: 25, icon: Shield, color: 'text-amber-600', border: 'ring-amber-600/50', bg: 'bg-amber-600/15', glow: 'shadow-[0_0_12px_-3px_rgba(217,119,6,0.4)]' },
  { name: 'Silver', threshold: 50, icon: Award, color: 'text-slate-300', border: 'ring-slate-300/50', bg: 'bg-slate-300/15', glow: 'shadow-[0_0_12px_-3px_rgba(203,213,225,0.4)]' },
  { name: 'Gold', threshold: 75, icon: Star, color: 'text-primary', border: 'ring-yellow-400/50', bg: 'bg-primary/15', glow: 'shadow-[0_0_12px_-3px_rgba(250,204,21,0.4)]' },
  { name: 'Summit', threshold: 100, icon: Mountain, color: 'text-primary', border: 'ring-primary/50', bg: 'bg-primary/15', glow: 'shadow-[0_0_16px_-3px_hsl(var(--primary)/0.5)]' },
] as const;

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Summit' | null;

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
          tier.bg, tier.color, tier.glow,
          tier.name === 'Summit' && 'animate-pulse',
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
        {tier.name} Tier — {percentage}% complete
      </TooltipContent>
    </Tooltip>
  );
}
