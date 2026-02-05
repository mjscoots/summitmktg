 import { Eye, X } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useRookieView } from '@/contexts/RookieViewContext';
 
 export function RookieViewBanner() {
   const { isRookieView, setRookieView } = useRookieView();
 
   if (!isRookieView) {
     return null;
   }
 
   return (
     <div className="bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between">
       <div className="flex items-center gap-2 text-sm">
         <Eye className="w-4 h-4 text-primary" />
         <span className="text-foreground">
           You are viewing this page as a <strong className="text-primary">Rookie</strong>
         </span>
       </div>
       <Button 
         size="sm" 
         variant="ghost"
         onClick={() => setRookieView(false)}
         className="h-7 gap-1.5 text-xs hover:bg-primary/20"
       >
         <X className="w-3.5 h-3.5" />
         Back to Manager View
       </Button>
     </div>
   );
 }