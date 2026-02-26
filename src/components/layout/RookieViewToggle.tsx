 import { Eye, EyeOff } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useRookieView } from '@/contexts/RookieViewContext';
 import { useAuth } from '@/hooks/useAuth';
 import { cn } from '@/lib/utils';
 
 export function RookieViewToggle() {
   const { role } = useAuth();
   const { isRookieView, toggleRookieView } = useRookieView();
 
   const isManager = role === 'manager' || role === 'admin' || role === 'owner';
 
   if (!isManager) {
     return null;
   }
 
   return (
     <Button
       variant="ghost"
       size="sm"
       onClick={toggleRookieView}
       className={cn(
         "gap-1.5 text-xs",
         isRookieView 
           ? "text-primary bg-primary/10 hover:bg-primary/20" 
           : "text-muted-foreground hover:text-foreground"
       )}
     >
       {isRookieView ? (
         <>
           <EyeOff className="w-3.5 h-3.5" />
           Manager View
         </>
       ) : (
         <>
           <Eye className="w-3.5 h-3.5" />
           Rookie View
         </>
       )}
     </Button>
   );
 }