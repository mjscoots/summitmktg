 import { cn } from '@/lib/utils';
 import { formatLastActive } from '@/hooks/useActivityTracking';
 
 interface ActivityIndicatorProps {
   lastActiveAt: string | null;
   isActiveNow?: boolean;
   showText?: boolean;
   size?: 'xs' | 'sm' | 'md';
   className?: string;
 }
 
 export function ActivityIndicator({
   lastActiveAt,
   isActiveNow,
   showText = true,
   size = 'sm',
   className,
 }: ActivityIndicatorProps) {
   // Check if truly active now (within last 5 minutes)
   const isActive = isActiveNow || (lastActiveAt && 
     (new Date().getTime() - new Date(lastActiveAt).getTime()) < 5 * 60 * 1000);
 
   const dotSizes = {
     xs: 'w-1.5 h-1.5',
     sm: 'w-2 h-2',
     md: 'w-2.5 h-2.5',
   };
 
   const textSizes = {
     xs: 'text-[10px]',
     sm: 'text-xs',
     md: 'text-sm',
   };
 
   return (
     <div className={cn('flex items-center gap-1.5', className)}>
       {/* Active indicator dot */}
       <div
         className={cn(
           'rounded-full flex-shrink-0',
           dotSizes[size],
           isActive 
             ? 'bg-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]' 
             : 'bg-muted-foreground/40'
         )}
       />
       {showText && (
         <span className={cn(
           'text-muted-foreground truncate',
           textSizes[size],
           isActive && 'text-success'
         )}>
           {formatLastActive(lastActiveAt)}
         </span>
       )}
     </div>
   );
 }