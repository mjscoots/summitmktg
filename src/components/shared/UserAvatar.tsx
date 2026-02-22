 import { useMemo } from 'react';
 import { cn } from '@/lib/utils';
 import { getTierBorderClass } from '@/components/shared/TierBadge';
 
interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  tierPct?: number;
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

export function UserAvatar({ avatarUrl, fullName, size = 'sm', className, showOnline, isOnline, tierPct }: UserAvatarProps) {
  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const bgColor = useMemo(() => getColorFromName(fullName), [fullName]);
  const tierBorder = tierPct != null ? getTierBorderClass(tierPct) : '';

  const onlineDot = showOnline ? (
    <span className={cn(
      'absolute bottom-0 right-0 rounded-full border-background',
      dotSizeClasses[size],
      isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
    )} />
  ) : null;

  if (avatarUrl) {
    return (
      <div className={cn(
        'relative rounded-full overflow-visible flex-shrink-0',
        sizeClasses[size],
        tierBorder,
        className
      )}>
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
    <div className={cn(
      'relative rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium',
      sizeClasses[size],
      bgColor,
      tierBorder,
      className
    )}>
      {initials}
      {onlineDot}
    </div>
  );
}