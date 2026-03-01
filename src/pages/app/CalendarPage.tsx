import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Calendar as CalendarIcon, Plus, Check, X, Users, 
  ChevronLeft, ChevronRight, Clock, Globe, Video, Building2,
  Pencil, Trash2, MapPin, Target, Shield, BarChart3
} from 'lucide-react';
import { 
  format, isFuture, isPast, isToday, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, 
  addMonths, subMonths, parseISO, addDays, addWeeks, addMonths as addMonthsFn,
  isBefore, isAfter, getDay, endOfWeek as endOfWeekFn
} from 'date-fns';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatInTimezone, getTimezoneShort } from '@/lib/timezones';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { SummitLoader } from '@/components/shared/SummitLoader';
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
  recurrence_days_of_week?: number[] | null;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
  _virtual?: boolean;
}

interface Attendance {
  event_id: string;
  user_id: string;
  status: 'attending' | 'not_attending';
  profile?: { full_name: string };
}

type EventCategory = 'all' | 'mandatory' | 'optional';

const EVENT_CATEGORY_MAP: Record<string, EventCategory> = {
  call: 'mandatory',
  deadline: 'mandatory',
  mandatory: 'mandatory',
  training: 'mandatory',
  meeting: 'mandatory',
  general: 'optional',
  optional: 'optional',
};

const getEventCategory = (type: string | null): EventCategory => {
  return EVENT_CATEGORY_MAP[type || 'general'] || 'optional';
};

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; dot: string; border: string; label: string }> = {
  all: { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-foreground', border: 'border-foreground', label: 'All' },
  mandatory: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500', label: 'Mandatory' },
  optional: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500', border: 'border-yellow-500', label: 'Optional' },
};

const getColor = (type: string | null) => {
  const cat = getEventCategory(type);
  return CATEGORY_COLORS[cat];
};

/** Check if event_date has a real time (not midnight) */
const hasTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
};

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
  const [activeFilter, setActiveFilter] = useState<EventCategory>('all');
  const [activeTab, setActiveTab] = useState<'calendar' | 'team_attendance'>('calendar');
  const [teamAttendanceData, setTeamAttendanceData] = useState<any[]>([]);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';

  // Reset filter when leaving and coming back
  useEffect(() => {
    setActiveFilter('all');
  }, []);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Expand recurring events
  const expandedEvents = useMemo(() => {
    const calStart = calendarDays[0];
    const calEnd = calendarDays[calendarDays.length - 1];
    const result: CalendarEvent[] = [];

    events.forEach(event => {
      result.push(event);
      if (!event.recurrence_type || event.recurrence_type === 'none') return;

      const interval = event.recurrence_interval || 1;
      const baseDate = new Date(event.event_date);
      const recEnd = event.recurrence_end_date ? new Date(event.recurrence_end_date) : null;
      const maxCount = event.recurrence_count || 200;
      let count = 0;
      let cursor = baseDate;

      const advance = (d: Date): Date => {
        switch (event.recurrence_type) {
          case 'daily': return addDays(d, interval);
          case 'weekly': return addDays(d, 7 * interval);
          case 'biweekly': return addDays(d, 14);
          case 'monthly': return addMonthsFn(d, interval);
          default: return addDays(d, 7);
        }
      };

      cursor = advance(cursor);
      while (count < maxCount) {
        if (recEnd && isAfter(cursor, recEnd)) break;
        if (isAfter(cursor, calEnd)) break;
        if (!isBefore(cursor, calStart)) {
          result.push({ ...event, event_date: cursor.toISOString(), end_date: null, _virtual: true });
        }
        cursor = advance(cursor);
        count++;
      }
    });

    return result;
  }, [events, calendarDays]);

  // Events by day
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const filtered = activeFilter === 'all' ? expandedEvents : expandedEvents.filter(e => getEventCategory(e.event_type) === activeFilter);
    filtered.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
    return map;
  }, [expandedEvents, activeFilter]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  const todayEvents = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM-dd');
    return expandedEvents
      .filter(e => format(new Date(e.event_date), 'yyyy-MM-dd') === key)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [expandedEvents]);

  // Upcoming this week
  const upcomingThisWeek = useMemo(() => {
    const now = new Date();
    const weekEnd = endOfWeekFn(now);
    return expandedEvents
      .filter(e => {
        const d = new Date(e.event_date);
        return (isFuture(d) || isToday(d)) && !isAfter(d, weekEnd);
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 10);
  }, [expandedEvents]);

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
          const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
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

  const fetchTeamAttendance = async () => {
    if (!user || !isManager || !profile?.full_name) return;
    try {
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: profile.full_name });
      if (!downline || downline.length === 0) return;
      const userIds = downline.map((d: any) => d.user_id);
      const { data: allAtt } = await supabase.from('calendar_attendance').select('user_id, status, event_id').in('user_id', userIds);
      const teamData = downline.map((member: any) => {
        const memberAtt = (allAtt || []).filter(a => a.user_id === member.user_id);
        const total = memberAtt.length;
        const attended = memberAtt.filter(a => a.status === 'attending').length;
        const missed = memberAtt.filter(a => a.status === 'not_attending').length;
        const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
        return { ...member, attendance_pct: pct, attended, missed, total };
      }).sort((a: any, b: any) => a.attendance_pct - b.attendance_pct);
      setTeamAttendanceData(teamData);
    } catch (err) { console.error('Error fetching team attendance:', err); }
  };

  useEffect(() => { fetchEvents(); }, [user, isManager]);
  useEffect(() => { if (activeTab === 'team_attendance') fetchTeamAttendance(); }, [activeTab]);

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
  const handleDayClick = (day: Date) => { setSelectedDate(day); };
  const handleDayDoubleClick = (day: Date) => {
    if (!isManager) return;
    setPrefillDate(format(day, 'yyyy-MM-dd'));
    setIsFormOpen(true);
  };
  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()); };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <SummitLoader label="Loading calendar..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Calendar</h1>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {getTimezoneShort(timezone)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-8">Today</Button>
            {isManager && (
              <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />Event
              </Button>
            )}
          </div>
        </div>

        {/* Manager tabs */}
        {isManager && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'calendar'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <CalendarIcon className="w-4 h-4 inline mr-1.5" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('team_attendance')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'team_attendance'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <Users className="w-4 h-4 inline mr-1.5" />
              Team Attendance
            </button>
          </div>
        )}

        {/* Team Attendance Tab */}
        {activeTab === 'team_attendance' && isManager && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Team Attendance
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Sorted by lowest attendance first</p>
            </div>
            {teamAttendanceData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No team members found</div>
            ) : (
              <div className="divide-y divide-border/30">
                {teamAttendanceData.map((member: any) => (
                  <div key={member.user_id} className={cn(
                    "flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30",
                    member.attendance_pct < 70 && "bg-red-500/[0.03]"
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role} · {member.team_name || 'No Team'}</p>
                    </div>
                    <div className="text-center px-3">
                      <p className={cn("text-lg font-black tabular-nums",
                        member.attendance_pct >= 90 ? "text-success" :
                        member.attendance_pct >= 70 ? "text-yellow-400" : "text-destructive"
                      )}>
                        {member.attendance_pct}%
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">Attendance</p>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-sm font-bold text-success tabular-nums">{member.attended}</p>
                        <p className="text-[10px] text-muted-foreground">Attended</p>
                      </div>
                      <div>
                        <p className={cn("text-sm font-bold tabular-nums",
                          member.missed > 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {member.missed}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Missed</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar View — layout swapped: left panel + right calendar */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
            {/* LEFT Panel — Today + Upcoming This Week */}
            <div className="space-y-4 order-2 lg:order-1">
              {/* Today's / Selected day events */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {selectedDate ? (
                    isToday(selectedDate)
                      ? "Today's Events"
                      : format(selectedDate, 'EEEE, MMM d')
                  ) : "Today's Events"}
                </h3>

                {(selectedDate ? selectedDayEvents : todayEvents).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
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
                      const eventPast = isPast(new Date(event.event_date));
                      const isMandatory = getEventCategory(event.event_type) === 'mandatory';
                      const wasMissed = eventPast && myStatus !== 'attending' && isMandatory;
                      const showTime = hasTime(event.event_date);

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all hover:translate-x-0.5",
                            "bg-background border border-border/40",
                            wasMissed && "ring-1 ring-red-500/20 bg-red-500/[0.03]"
                          )}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                                <p className="text-sm font-semibold text-foreground break-words">{event.title}</p>
                                {isMandatory && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 uppercase shrink-0">
                                    Required
                                  </span>
                                )}
                              </div>
                              {showTime && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 ml-3.5">
                                  <Clock className="w-3 h-3" />
                                  {formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}
                                  {event.end_date && ` – ${formatInTimezone(new Date(event.end_date), timezone, 'h:mm a')}`}
                                </p>
                              )}
                              {!showTime && (
                                <p className="text-xs text-muted-foreground ml-3.5">All day</p>
                              )}
                              {event.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 ml-3.5">
                                  <MapPin className="w-3 h-3" />
                                  <span className="break-words">{event.location}</span>
                                </p>
                              )}
                              <div className="mt-1.5 ml-3.5">
                                {myStatus === 'attending' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" /> Attended
                                  </span>
                                ) : wasMissed ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                    <X className="w-3 h-3" /> Missed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                              </div>
                            </div>
                            {!eventPast && (
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
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming This Week */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Upcoming This Week</h3>
                {upcomingThisWeek.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming events this week</p>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {upcomingThisWeek.map(event => {
                      const color = getColor(event.event_type);
                      const eventDate = new Date(event.event_date);
                      const showT = hasTime(event.event_date);
                      return (
                        <button
                          key={`${event.id}-${event.event_date}`}
                          onClick={() => { setSelectedEvent(event); setSelectedDate(eventDate); }}
                          className="w-full text-left flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className={cn("w-1.5 h-8 rounded-full shrink-0", color.dot)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground break-words group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-bold">{isToday(eventDate) ? 'Today' : format(eventDate, 'EEE, MMM d')}</span>
                              {showT && ` · ${formatInTimezone(eventDate, timezone, 'h:mm a')}`}
                              {!showT && ' · All day'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Main Calendar Grid */}
            <div className="order-1 lg:order-2">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {(['all', 'mandatory', 'optional'] as EventCategory[]).map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
                        activeFilter === cat
                          ? cn(c.bg, c.text, "ring-1 ring-current/30")
                          : "bg-secondary text-muted-foreground hover:text-foreground border border-border/30"
                      )}
                    >
                      {cat !== 'all' && <span className={cn("w-2 h-2 rounded-full", c.dot)} />}
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Month Navigation — bigger arrows */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40 hover:border-primary/40"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40 hover:border-primary/40"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-px">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 border-t border-l border-border/40 rounded-lg overflow-hidden bg-card">
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
                        "min-h-[100px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors group relative",
                        !inMonth && "bg-muted/10",
                        inMonth && "hover:bg-primary/[0.03]",
                        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        today && !isSelected && "bg-primary/[0.02]"
                      )}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                          today && "bg-primary text-primary-foreground font-bold",
                          !today && inMonth && "text-foreground",
                          !inMonth && "text-muted-foreground/30"
                        )}>
                          {format(day, 'd')}
                        </span>
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

                      <div className="mt-0.5 space-y-px">
                        {dayEvents.slice(0, 3).map(event => {
                          const color = getColor(event.event_type);
                          return (
                            <button
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                              className={cn(
                                "w-full text-left text-[11px] leading-snug font-medium px-1.5 py-[3px] rounded transition-all hover:brightness-110",
                                color.bg, color.text
                              )}
                              title={event.title}
                            >
                              <span className="flex items-start gap-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px]", color.dot)} />
                                <span className="line-clamp-2 break-words">{event.title}</span>
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
                {(['mandatory', 'optional'] as EventCategory[]).map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <span key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                      {c.label}
                    </span>
                  );
                })}
                {isManager && (
                  <span className="text-xs text-muted-foreground/50 ml-auto">
                    Double-click to create
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

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
