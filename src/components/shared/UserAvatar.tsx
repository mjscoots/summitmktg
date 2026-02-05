 import { useMemo } from 'react';
 import { cn } from '@/lib/utils';
 
 interface UserAvatarProps {
   avatarUrl?: string | null;
   fullName: string;
   size?: 'xs' | 'sm' | 'md' | 'lg';
   className?: string;
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
   md: 'w-9 h-9 text-xs',
   lg: 'w-12 h-12 text-sm',
 };
 
 export function UserAvatar({ avatarUrl, fullName, size = 'sm', className }: UserAvatarProps) {
   const initials = useMemo(() => getInitials(fullName), [fullName]);
   const bgColor = useMemo(() => getColorFromName(fullName), [fullName]);
 
   if (avatarUrl) {
     return (
       <div className={cn(
         'rounded-full overflow-hidden flex-shrink-0',
         sizeClasses[size],
         className
       )}>
         <img 
           src={avatarUrl} 
           alt={fullName} 
           className="w-full h-full object-cover"
         />
       </div>
     );
   }
 
   return (
     <div className={cn(
       'rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium',
       sizeClasses[size],
       bgColor,
       className
     )}>
       {initials}
     </div>
   );
 }