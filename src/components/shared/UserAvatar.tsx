 import { useMemo } from 'react';
 import { cn } from '@/lib/utils';
 import { getTierBorderClass } from '@/components/shared/TierBadge';
 import { getTeamColor } from '@/lib/teamColors';
 
interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  tierPct?: number;
  teamName?: string | null;
  /** Leaderboard rank (1-based). Lower = stronger glow. */
  rank?: number;
  /** Total number of entries on leaderboard, used to scale glow intensity */
  totalEntries?: number;
}
 
 // Generate a consistent color based on name hash
 function getColorFromName(name: string): string {
   const colors = [
     'bg-red-500',
     'bg-orange-500',
     'bg-amber-500',
     'bg-yellow-500',
     'bg-lime-500',
     'bg-green-500',
     'bg-emerald-500',
     'bg-teal-500',
     'bg-cyan-500',
     'bg-sky-500',
     'bg-blue-500',
     'bg-indigo-500',
     'bg-violet-500',
     'bg-purple-500',
     'bg-fuchsia-500',
     'bg-pink-500',
     'bg-rose-500',
   ];
   
   let hash = 0;
   for (let i = 0; i < name.length; i++) {
     hash = name.charCodeAt(i) + ((hash << 5) - hash);
   }
   
   return colors[Math.abs(hash) % colors.length];
 }
 
 function getInitials(name: string): string {
   const parts = name.trim().split(/\s+/);
   if (parts.length === 0) return '?';
   if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
   return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
 }
 
const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
};

const dotSizeClasses = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
};

export function UserAvatar({ avatarUrl, fullName, size = 'sm', className, showOnline, isOnline, tierPct, teamName, rank, totalEntries }: UserAvatarProps) {
  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const teamColor = useMemo(() => getTeamColor(teamName), [teamName]);
  const bgColor = useMemo(() => teamName ? teamColor.bg : getColorFromName(fullName), [teamName, teamColor, fullName]);
  const tierBorder = tierPct != null ? getTierBorderClass(tierPct) : '';

  // Compute rank-based glow style
  const rankGlowStyle = useMemo(() => {
    if (rank == null || rank < 1) return {};
    const total = totalEntries || 20;
    // Percentile: 1.0 = top, 0.0 = bottom
    const pct = 1 - (rank - 1) / Math.max(total - 1, 1);
    if (pct < 0.3) return {}; // Bottom 70% get no glow
    
    // Scale intensity: top rank gets strongest glow
    const intensity = Math.round(pct * 100);
    const spread = Math.round(4 + pct * 12); // 4px to 16px
    const opacity = (0.15 + pct * 0.55).toFixed(2); // 0.15 to 0.70
    
    // Color shifts from blue (lower) → gold (top 3) → white-gold (#1)
    let color: string;
    if (rank === 1) color = `rgba(250, 204, 21, ${opacity})`; // gold
    else if (rank === 2) color = `rgba(192, 192, 230, ${opacity})`; // silver
    else if (rank === 3) color = `rgba(205, 127, 50, ${opacity})`; // bronze
    else if (pct >= 0.7) color = `rgba(234, 179, 8, ${opacity})`; // warm gold
    else color = `rgba(59, 130, 246, ${opacity})`; // blue
    
    return {
      boxShadow: `0 0 ${spread}px ${Math.round(spread / 2)}px ${color}`,
      transition: 'box-shadow 0.3s ease',
    };
  }, [rank, totalEntries]);

  const onlineDot = showOnline ? (
    <span className={cn(
      'absolute bottom-0 right-0 rounded-full border-background',
      dotSizeClasses[size],
      isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
    )} />
  ) : null;

  if (avatarUrl) {
    return (
      <div
        className={cn(
          'relative rounded-full overflow-visible flex-shrink-0',
          sizeClasses[size],
          tierBorder,
          className
        )}
        style={rankGlowStyle}
      >
        <img 
          src={avatarUrl} 
          alt={fullName} 
          className="w-full h-full rounded-full object-cover"
        />
        {onlineDot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium',
        sizeClasses[size],
        bgColor,
        tierBorder,
        className
      )}
      style={rankGlowStyle}
    >
      {initials}
      {onlineDot}
    </div>
  );
}