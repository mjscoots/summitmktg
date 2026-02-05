 import { useEffect, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Calendar, Clock, ChevronRight } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 
 interface ScheduleItem {
   id: string;
   day_of_week: number;
   title: string;
   time_pst: string | null;
   description: string | null;
 }
 
 const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
 
 // Items to hide from the schedule
 const HIDDEN_ITEMS = ['Academy Call', 'Academy'];
 
 // Items visible only to managers
 const MANAGER_ONLY_ITEMS = ['Manager Call'];
 
 export function WeeklyScheduleExpanded() {
   const navigate = useNavigate();
   const { role } = useAuth();
   const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
   const [isLoading, setIsLoading] = useState(true);
 
   const dbRole = role === 'manager' || role === 'admin' ? 'manager' : 'rookie';
   const isManager = role === 'manager' || role === 'admin';
 
   useEffect(() => {
     const fetchSchedule = async () => {
       try {
         const { data, error } = await supabase
           .from('schedule_items')
           .select('*')
           .eq('target_role', dbRole)
           .eq('is_active', true)
           .order('day_of_week');
 
         if (error) {
           console.error('Error fetching schedule:', error);
           return;
         }
         
         // Filter out hidden items and manager-only items for non-managers
         let filteredData = (data || []).filter(item => {
           // Hide Academy Call for everyone
           if (HIDDEN_ITEMS.some(hidden => item.title.includes(hidden))) {
             return false;
           }
           // Hide Manager Call for non-managers
           if (!isManager && MANAGER_ONLY_ITEMS.some(managerOnly => item.title.includes(managerOnly))) {
             return false;
           }
           return true;
         });
         
         setSchedule(filteredData);
       } catch (err) {
         console.error('Error:', err);
       } finally {
         setIsLoading(false);
       }
     };
     fetchSchedule();
   }, [dbRole, isManager]);
 
   const scheduleByDay = DAYS.map((day, index) => ({
     short: day,
     dayIndex: index,
     items: schedule.filter(item => item.day_of_week === index)
   })).filter(day => day.items.length > 0);
 
   const today = new Date().getDay();
   
   // Count required events this week
   const requiredEventCount = schedule.length;
 
   if (isLoading) {
     return (
       <div className="bg-card rounded-lg border border-border/50 p-4 h-full">
         <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
       </div>
     );
   }
 
   return (
     <div className="bg-card rounded-lg border border-border/50 h-full flex flex-col relative overflow-hidden">
       {/* Blue accent line */}
       <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/40" />
       
       <div className="p-3 border-b border-border/30 flex items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-2">
           <Calendar className="w-4 h-4 text-primary" />
           <h2 className="font-semibold text-sm text-foreground">This Week</h2>
           {requiredEventCount > 0 && (
             <span className="text-[10px] text-muted-foreground/70">
               {requiredEventCount} events
             </span>
           )}
         </div>
         <Button
           variant="ghost"
           size="sm"
           onClick={() => navigate('/app/calendar')}
           className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
         >
           Monthly
           <ChevronRight className="w-3 h-3" />
         </Button>
       </div>
       
       <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
         {scheduleByDay.length === 0 ? (
           <div className="text-center py-6">
             <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
             <p className="text-sm text-muted-foreground">No events scheduled</p>
           </div>
         ) : (
           scheduleByDay.map((day) => {
             const isPast = day.dayIndex < today;
             const isToday = day.dayIndex === today;
             
             return (
               <div 
                 key={day.dayIndex}
                 className={cn(
                   "p-2.5 rounded-md border transition-all",
                   isToday 
                     ? "border-primary/50 bg-primary/8 shadow-[0_0_12px_-4px_rgba(59,130,246,0.3)]" 
                     : isPast
                       ? "border-border/20 bg-muted/10 opacity-60"
                       : "border-border/30 bg-muted/20"
                 )}
               >
                 <div className="flex items-center gap-2 mb-1.5">
                   <span className={cn(
                     "text-[10px] font-bold px-1.5 py-0.5 rounded",
                     isToday 
                       ? "bg-primary text-primary-foreground" 
                       : isPast
                         ? "bg-muted/50 text-muted-foreground/60"
                         : "bg-muted text-muted-foreground"
                   )}>
                     {day.short}
                   </span>
                   {isToday && (
                     <span className="text-[10px] text-primary font-medium">Today</span>
                   )}
                 </div>
                 <div className="space-y-1">
                   {day.items.map((item) => (
                     <div key={item.id} className="flex items-start gap-1.5">
                       <Clock className={cn(
                         "w-3 h-3 mt-0.5 flex-shrink-0",
                         isPast ? "text-muted-foreground/40" : "text-muted-foreground"
                       )} />
                       <div className="flex-1 min-w-0">
                         <div className="flex items-baseline gap-1.5">
                           <span className={cn(
                             "text-xs font-medium truncate",
                             isPast ? "text-muted-foreground/60" : "text-foreground"
                           )}>
                             {item.title}
                           </span>
                           {item.time_pst && (
                             <span className={cn(
                               "text-[10px] font-medium flex-shrink-0",
                               isPast ? "text-primary/40" : "text-primary"
                             )}>
                               {item.time_pst}
                             </span>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             );
           })
         )}
       </div>
     </div>
   );
 }