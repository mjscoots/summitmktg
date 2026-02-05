 import { useMemo } from 'react';
 import { format, addDays, isToday, isSameDay, parseISO, startOfDay } from 'date-fns';
 import { Calendar, Users, User, Globe } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface CalendarEvent {
   id: string;
   title: string;
   description: string | null;
   event_date: string;
   end_date: string | null;
   location: string | null;
   event_type: string | null;
   is_team_wide: boolean;
   manager_id: string | null;
   created_by: string | null;
   team_id?: string | null;
 }
 
 interface WeeklyOutlookProps {
   events: CalendarEvent[];
   userTeamId: string | null;
   onEventClick?: (event: CalendarEvent) => void;
 }
 
 export function WeeklyOutlook({ events, userTeamId, onEventClick }: WeeklyOutlookProps) {
   // Generate next 7 days
   const days = useMemo(() => {
     const today = startOfDay(new Date());
     return Array.from({ length: 7 }, (_, i) => addDays(today, i));
   }, []);
 
   // Group events by day
   const eventsByDay = useMemo(() => {
     const grouped: Record<string, CalendarEvent[]> = {};
     
     days.forEach(day => {
       const dayKey = format(day, 'yyyy-MM-dd');
       grouped[dayKey] = events.filter(event => {
         const eventDate = parseISO(event.event_date);
         return isSameDay(eventDate, day);
       }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
     });
     
     return grouped;
   }, [events, days]);
 
   // Determine event scope/color
   const getEventScope = (event: CalendarEvent) => {
     // Summit-wide events (no specific team or marked as team-wide with no team_id)
     if (!event.team_id && event.is_team_wide) {
       return { label: 'Summit-Wide', color: 'bg-red-500', textColor: 'text-red-400', icon: Globe };
     }
     // Team events
     if (event.is_team_wide && event.team_id) {
       return { label: 'Team', color: 'bg-blue-500', textColor: 'text-blue-400', icon: Users };
     }
     // Personal events (assigned specifically to user)
     return { label: 'Personal', color: 'bg-green-500', textColor: 'text-green-400', icon: User };
   };
 
   return (
     <div className="mb-8">
       <div className="flex items-center gap-2 mb-4">
         <Calendar className="w-5 h-5 text-primary" />
         <h2 className="text-lg font-semibold text-foreground">Next 7 Days</h2>
       </div>
       
       <div className="bg-card rounded-lg border border-border overflow-hidden">
         {/* Legend */}
         <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 text-xs">
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-green-500" />
             <span className="text-muted-foreground">Personal</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-blue-500" />
             <span className="text-muted-foreground">Team</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-red-500" />
             <span className="text-muted-foreground">Summit-Wide</span>
           </div>
         </div>
 
         {/* Days */}
         <div className="divide-y divide-border">
           {days.map(day => {
             const dayKey = format(day, 'yyyy-MM-dd');
             const dayEvents = eventsByDay[dayKey] || [];
             const isCurrentDay = isToday(day);
 
             return (
               <div
                 key={dayKey}
                 className={cn(
                   "px-4 py-3",
                   isCurrentDay && "bg-primary/5"
                 )}
               >
                 <div className="flex items-center gap-2 mb-2">
                   <span className={cn(
                     "text-sm font-semibold",
                     isCurrentDay ? "text-primary" : "text-foreground"
                   )}>
                     {format(day, 'EEEE')}
                   </span>
                   <span className="text-xs text-muted-foreground">
                     {format(day, 'MMM d')}
                   </span>
                   {isCurrentDay && (
                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                       Today
                     </span>
                   )}
                 </div>
 
                 {dayEvents.length === 0 ? (
                   <p className="text-xs text-muted-foreground italic">No events scheduled</p>
                 ) : (
                   <div className="space-y-1.5">
                     {dayEvents.map(event => {
                       const scope = getEventScope(event);
                       const ScopeIcon = scope.icon;
                       const eventTime = format(parseISO(event.event_date), 'h:mm a');
 
                       return (
                         <button
                           key={event.id}
                           onClick={() => onEventClick?.(event)}
                           className={cn(
                             "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                             "hover:bg-muted/50 group"
                           )}
                         >
                           <div className={cn("w-1.5 h-8 rounded-full", scope.color)} />
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-medium text-muted-foreground">
                                 {eventTime}
                               </span>
                               <ScopeIcon className={cn("w-3 h-3", scope.textColor)} />
                             </div>
                             <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                               {event.title}
                             </p>
                           </div>
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
           })}
         </div>
       </div>
     </div>
   );
 }