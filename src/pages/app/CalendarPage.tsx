import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Calendar as CalendarIcon, Plus, Check, X, Users, 
  ChevronLeft, ChevronRight, Clock, Globe, Video, Building2,
  Pencil, Trash2, MapPin
} from 'lucide-react';
import { 
  format, isFuture, isPast, isToday, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, 
  addMonths, subMonths, parseISO 
} from 'date-fns';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatInTimezone, getTimezoneShort } from '@/lib/timezones';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { PageBackButton } from '@/components/shared/PageBackButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
}

interface Attendance {
  event_id: string;
  user_id: string;
  status: 'attending' | 'not_attending';
  profile?: { full_name: string };
}

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  training: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500' },
  meeting: { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-500' },
  deadline: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-500' },
  call: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  general: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

const getColor = (type: string | null) => EVENT_COLORS[type || 'general'] || EVENT_COLORS.general;

export default function CalendarPage() {
  const { role, user, profile } = useAuth();
  const { timezone } = useUserTimezone();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({});
  const [userAttendance, setUserAttendance] = useState<Record<string, 'attending' | 'not_attending'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Events by day for quick lookup
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    // Sort each day's events by time
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
    return map;
  }, [events]);

  // Selected day's events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  // Today's upcoming
  const todayEvents = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [eventsByDay]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const { data: userAssignments } = await supabase
        .from('calendar_event_assignees')
        .select('event_id')
        .eq('user_id', user.id);
      const assignedEventIds = (userAssignments || []).map(a => a.event_id);

      const { data: eventsData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });
      if (error) { console.error('Error fetching events:', error); return; }

      const filteredEvents = (eventsData || []).filter(event => {
        if (event.created_by === user.id || event.manager_id === user.id) return true;
        if (event.is_team_wide) return true;
        if (assignedEventIds.includes(event.id)) return true;
        return false;
      });
      setEvents(filteredEvents);

      const { data: userAttendanceData } = await supabase
        .from('calendar_attendance')
        .select('event_id, status')
        .eq('user_id', user.id);
      const userAttMap: Record<string, 'attending' | 'not_attending'> = {};
      (userAttendanceData || []).forEach(a => { userAttMap[a.event_id] = a.status as 'attending' | 'not_attending'; });
      setUserAttendance(userAttMap);

      if (isManager && eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: allAttendance } = await supabase
          .from('calendar_attendance')
          .select('event_id, user_id, status')
          .in('event_id', eventIds);
        if (allAttendance && allAttendance.length > 0) {
          const userIds = [...new Set(allAttendance.map(a => a.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
          const attendanceByEvent: Record<string, Attendance[]> = {};
          allAttendance.forEach(a => {
            if (!attendanceByEvent[a.event_id]) attendanceByEvent[a.event_id] = [];
            attendanceByEvent[a.event_id].push({ ...a, status: a.status as 'attending' | 'not_attending', profile: profileMap.get(a.user_id) });
          });
          setAttendance(attendanceByEvent);
        }
      }
    } catch (err) { console.error('Error:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [user, isManager]);

  const handleAttendanceToggle = async (eventId: string, status: 'attending' | 'not_attending') => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('calendar_attendance')
        .upsert({ event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
      if (error) { toast.error('Failed to update attendance'); return; }
      setUserAttendance(prev => ({ ...prev, [eventId]: status }));
      toast.success(status === 'attending' ? 'Marked as attending' : 'Marked as not attending');
      if (isManager) fetchEvents();
    } catch { toast.error('Something went wrong'); }
  };

  const handleEditEvent = (event: CalendarEvent) => { setEditingEvent(event); setIsFormOpen(true); };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    try {
      const eventToDelete = events.find(e => e.id === deleteEventId);
      if (eventToDelete && profile) {
        const { data: assignees } = await supabase.from('calendar_event_assignees').select('user_id').eq('event_id', deleteEventId);
        const userIds = assignees?.map(a => a.user_id) || [];
        if (userIds.length > 0 || eventToDelete.is_team_wide) {
          let notifyIds = userIds;
          if (eventToDelete.is_team_wide && profile.full_name) {
            const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: profile.full_name });
            notifyIds = downline?.map((d: { user_id: string }) => d.user_id) || [];
          }
          if (notifyIds.length > 0) {
            await supabase.functions.invoke('send-calendar-notification', {
              body: { event_id: deleteEventId, event_title: eventToDelete.title, event_date: eventToDelete.event_date, manager_name: profile.full_name || 'Your manager', action: 'deleted', user_ids: notifyIds }
            });
          }
        }
      }
      const { error } = await supabase.from('calendar_events').delete().eq('id', deleteEventId);
      if (error) throw error;
      toast.success('Event deleted');
      fetchEvents();
    } catch (error) { console.error('Error deleting event:', error); toast.error('Failed to delete event'); }
    finally { setDeleteEventId(null); }
  };

  const handleFormClose = () => { setIsFormOpen(false); setEditingEvent(null); setPrefillDate(null); };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleDayDoubleClick = (day: Date) => {
    if (!isManager) return;
    setPrefillDate(format(day, 'yyyy-MM-dd'));
    setIsFormOpen(true);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {getTimezoneShort(timezone)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-8">
              Today
            </Button>
            {isManager && (
              <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />
                Event
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* Main Calendar Grid */}
          <div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-t border-l border-border/60 rounded-lg overflow-hidden bg-card">
              {calendarDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay[key] || [];
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={key}
                    onClick={() => handleDayClick(day)}
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    className={cn(
                      "min-h-[90px] p-1 border-b border-r border-border/40 cursor-pointer transition-colors group relative",
                      !inMonth && "bg-muted/20",
                      inMonth && "hover:bg-accent/30",
                      isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                      today && !isSelected && "bg-primary/[0.03]"
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between px-0.5">
                      <span className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                        today && "bg-primary text-primary-foreground font-bold",
                        !today && inMonth && "text-foreground",
                        !inMonth && "text-muted-foreground/40"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {/* Quick add on hover (managers only) */}
                      {isManager && inMonth && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPrefillDate(key); setIsFormOpen(true); }}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full hover:bg-primary/20 text-primary transition-all"
                          title="Create event"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Events */}
                    <div className="mt-0.5 space-y-px">
                      {dayEvents.slice(0, 3).map(event => {
                        const color = getColor(event.event_type);
                        return (
                          <button
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={cn(
                              "w-full text-left text-[10px] leading-tight font-medium px-1.5 py-[3px] rounded truncate transition-all hover:brightness-110",
                              color.bg, color.text
                            )}
                          >
                            <span className="truncate block">
                              {format(new Date(event.event_date), 'h:mma').toLowerCase().replace(':00', '')} {event.title}
                            </span>
                          </button>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                          className="text-[10px] text-primary font-medium px-1.5 hover:underline"
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
              {Object.entries(EVENT_COLORS).filter(([k]) => k !== 'general').map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground capitalize">
                  <span className={cn("w-2 h-2 rounded-full", val.dot)} />
                  {key === 'call' ? 'Team Call' : key}
                </span>
              ))}
              {isManager && (
                <span className="text-[11px] text-muted-foreground/60 ml-auto">
                  Double-click a day to create event
                </span>
              )}
            </div>
          </div>

          {/* Right Sidebar — Day Detail */}
          <div className="space-y-4">
            {/* Selected / Today panel */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {selectedDate ? (
                  isToday(selectedDate)
                    ? "Today's Schedule"
                    : format(selectedDate, 'EEEE, MMM d')
                ) : "Today's Schedule"}
              </h3>

              {(selectedDate ? selectedDayEvents : todayEvents).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No events</p>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs h-7"
                      onClick={() => {
                        setPrefillDate(format(selectedDate || new Date(), 'yyyy-MM-dd'));
                        setIsFormOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add event
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {(selectedDate ? selectedDayEvents : todayEvents).map(event => {
                    const color = getColor(event.event_type);
                    const myStatus = userAttendance[event.id];
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border-l-[3px] cursor-pointer transition-all hover:shadow-sm hover:translate-x-0.5",
                          "bg-background border border-border/50",
                          color.dot.replace('bg-', 'border-l-')
                        )}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}
                              {event.end_date && ` – ${formatInTimezone(new Date(event.end_date), timezone, 'h:mm a')}`}
                            </p>
                            {event.location && (
                              <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </p>
                            )}
                          </div>

                          {/* Quick RSVP */}
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAttendanceToggle(event.id, 'attending'); }}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                myStatus === 'attending'
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10"
                              )}
                              title="Attending"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAttendanceToggle(event.id, 'not_attending'); }}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                myStatus === 'not_attending'
                                  ? "bg-red-500/20 text-red-400"
                                  : "text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10"
                              )}
                              title="Not attending"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events Mini-List */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming</h3>
              {events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date))).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {events
                    .filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)))
                    .slice(0, 8)
                    .map(event => {
                      const color = getColor(event.event_type);
                      const eventDate = new Date(event.event_date);
                      return (
                        <button
                          key={event.id}
                          onClick={() => { setSelectedEvent(event); setSelectedDate(eventDate); }}
                          className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className={cn("w-1.5 h-8 rounded-full shrink-0", color.dot)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {isToday(eventDate) ? 'Today' : format(eventDate, 'EEE, MMM d')} · {format(eventDate, 'h:mm a')}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manager Event Form */}
        <ManagerEventForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSave={fetchEvents}
          prefillDate={prefillDate}
          event={editingEvent ? {
            ...editingEvent,
            description: editingEvent.description || '',
            location: editingEvent.location || '',
            event_type: editingEvent.event_type || 'general',
            assignees: []
          } : null}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this event and notify all assigned team members.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Event Details Modal */}
        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onEdit={(event) => { setSelectedEvent(null); handleEditEvent(event); }}
            onDelete={(eventId) => { setSelectedEvent(null); setDeleteEventId(eventId); }}
            canEdit={isAdmin || (isManager && selectedEvent.manager_id === user?.id)}
          />
        )}
      </main>
    </AppLayout>
  );
}
