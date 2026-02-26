import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, ChevronRight, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatInTimezone, getTimezoneShort } from '@/lib/timezones';

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
}

interface ScheduleItem {
  id: string;
  day_of_week: number;
  title: string;
  time_pst: string | null;
  description: string | null;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Items to hide from the schedule
const HIDDEN_ITEMS = ['Academy Call', 'Academy'];

// Items visible only to managers
const MANAGER_ONLY_ITEMS = ['Manager Call'];

export function WeeklyScheduleExpanded() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { timezone } = useUserTimezone();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const dbRole = role === 'manager' || role === 'admin' || role === 'owner' ? 'manager' : 'rookie';
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch schedule items
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('target_role', dbRole)
          .eq('is_active', true)
          .order('day_of_week');

        if (!scheduleError) {
          // Filter out hidden items and manager-only items for non-managers
          let filteredData = (scheduleData || []).filter(item => {
            if (HIDDEN_ITEMS.some(hidden => item.title.includes(hidden))) {
              return false;
            }
            if (!isManager && MANAGER_ONLY_ITEMS.some(managerOnly => item.title.includes(managerOnly))) {
              return false;
            }
            return true;
          });
          setSchedule(filteredData);
        }

        // Fetch user's calendar events for this week
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

        // Get events assigned to user
        const { data: userAssignments } = await supabase
          .from('calendar_event_assignees')
          .select('event_id')
          .eq('user_id', user.id);

        const assignedEventIds = (userAssignments || []).map(a => a.event_id);

        // Fetch calendar events
        const { data: eventsData } = await supabase
          .from('calendar_events')
          .select('*')
          .gte('event_date', weekStart.toISOString())
          .lte('event_date', weekEnd.toISOString())
          .order('event_date', { ascending: true });

        // Filter events user can see
        const filteredEvents = (eventsData || []).filter(event => {
          if (event.created_by === user.id || event.manager_id === user.id) return true;
          if (event.is_team_wide) return true;
          if (assignedEventIds.includes(event.id)) return true;
          return false;
        });

        setCalendarEvents(filteredEvents);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dbRole, isManager, user]);

  const today = new Date().getDay();
  const todayDate = new Date();

  // Combine schedule items and calendar events by day
  const combinedByDay = DAYS.map((day, index) => {
    const scheduleItems = schedule.filter(item => item.day_of_week === index);
    const dayDate = new Date(startOfWeek(todayDate, { weekStartsOn: 0 }));
    dayDate.setDate(dayDate.getDate() + index);
    
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, dayDate);
    });

    return {
      short: day,
      full: DAY_NAMES[index],
      dayIndex: index,
      date: dayDate,
      scheduleItems,
      calendarEvents: dayEvents,
      hasItems: scheduleItems.length > 0 || dayEvents.length > 0
    };
  }).filter(day => day.hasItems);

  const totalEventCount = schedule.length + calendarEvents.length;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-4 h-full">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border/50 h-full flex flex-col relative overflow-hidden">
        {/* Blue accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/40" />
        
        <div className="p-3 border-b border-border/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">This Week</h2>
            {totalEventCount > 0 && (
              <span className="text-[10px] text-muted-foreground/70">
                {totalEventCount} events
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/calendar')}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            All Events
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {combinedByDay.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No events this week</p>
            </div>
          ) : (
            combinedByDay.map((day) => {
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
                    <span className="text-[10px] text-muted-foreground">
                      {format(day.date, 'MMM d')}
                    </span>
                    {isToday && (
                      <span className="text-[10px] text-primary font-medium">Today</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {/* Schedule items (recurring weekly) */}
                    {day.scheduleItems.map((item) => (
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
                    
                    {/* Calendar events */}
                    {day.calendarEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full flex items-start gap-1.5 text-left rounded px-1 py-0.5 -mx-1",
                          "hover:bg-primary/10 transition-colors cursor-pointer"
                        )}
                      >
                        <Calendar className={cn(
                          "w-3 h-3 mt-0.5 flex-shrink-0 text-primary",
                          isPast && "opacity-40"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className={cn(
                              "text-xs font-medium truncate",
                              isPast ? "text-muted-foreground/60" : "text-foreground"
                            )}>
                              {event.title}
                            </span>
                            <span className={cn(
                              "text-[10px] font-medium flex-shrink-0",
                              isPast ? "text-primary/40" : "text-primary"
                            )}>
                              {formatInTimezone(parseISO(event.event_date), timezone, 'h:mm a')}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-muted-foreground/60" />
                              <span className="text-[10px] text-muted-foreground/60 truncate">
                                {event.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}