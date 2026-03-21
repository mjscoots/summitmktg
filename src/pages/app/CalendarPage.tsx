import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove, isAdminOrAbove } from '@/lib/roles';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Calendar as CalendarIcon, Plus, Check, X, 
  ChevronLeft, ChevronRight, Clock, Globe, Video, Building2,
  MapPin, Target, BarChart3, ListChecks, Eye,
  List, LayoutGrid, ArrowLeft
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
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ───
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

interface AttendanceRecord {
  event_id: string;
  user_id: string;
  status: 'attending' | 'not_attending';
  updated_at: string | null;
  profile?: { full_name: string };
}

type EventCategory = 'all' | 'mandatory' | 'optional';
type LocationFilter = 'all' | 'in-person' | 'remote';
type CalendarTab = 'calendar' | 'attendance';
type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';
type RSVPSubView = 'cards' | 'responses';

// ─── Constants ───
const EVENT_CATEGORY_MAP: Record<string, EventCategory> = {
  call: 'mandatory', deadline: 'mandatory', mandatory: 'mandatory',
  training: 'mandatory', meeting: 'mandatory',
  general: 'optional', optional: 'optional',
};

const getEventCategory = (type: string | null): EventCategory =>
  EVENT_CATEGORY_MAP[type || 'general'] || 'optional';

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; dot: string; border: string; label: string }> = {
  all: { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-foreground', border: 'border-foreground', label: 'All' },
  mandatory: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500/50', label: 'Mandatory' },
  optional: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500', border: 'border-yellow-500/50', label: 'Optional' },
};

const getColor = (type: string | null) => CATEGORY_COLORS[getEventCategory(type)];

const isRemoteLocation = (location: string | null): boolean | null => {
  if (!location) return null;
  const loc = location.toLowerCase();
  return loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('http') || loc.includes('virtual') || loc.includes('remote') || loc.includes('online');
};

const hasTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
};

const isRecurring = (event: CalendarEvent) =>
  event.recurrence_type && event.recurrence_type !== 'none';

// Truncate title for calendar cells
const truncateTitle = (title: string, maxWords = 3): string => {
  const words = title.split(/\s+/);
  if (words.length <= maxWords) return title;
  return words.slice(0, maxWords).join(' ');
};

// ─── Component ───
export default function CalendarPage() {
  const { role, user, profile } = useAuth();
  const { timezone } = useUserTimezone();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todoEvents, setTodoEvents] = useState<CalendarEvent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [userAttendance, setUserAttendance] = useState<Record<string, { status: 'attending' | 'not_attending'; updated_at: string | null }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventCategory>('all');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendar');
  const [attendanceCardIndex, setAttendanceCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());

  const isManager = isManagerOrAbove(role);
  const isAdmin = isAdminOrAbove(role);
  const currentWeekStart = useMemo(() => startOfWeek(new Date()).toISOString(), []);

  useEffect(() => {
    setActiveFilter('all');
    setLocationFilter('all');
    setActiveTab('calendar');
  }, []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [currentMonth]);

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
    return [...result, ...todoEvents];
  }, [events, calendarDays, todoEvents]);

  const locationFilteredEvents = useMemo(() => {
    if (locationFilter === 'all') return expandedEvents;
    return expandedEvents.filter(e => {
      const remote = isRemoteLocation(e.location);
      if (locationFilter === 'remote') return remote === true;
      if (locationFilter === 'in-person') return remote === false;
      return true;
    });
  }, [expandedEvents, locationFilter]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const filtered = activeFilter === 'all' ? locationFilteredEvents : locationFilteredEvents.filter(e => getEventCategory(e.event_type) === activeFilter);
    filtered.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
    return map;
  }, [locationFilteredEvents, activeFilter]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDay[format(selectedDate, 'yyyy-MM-dd')] || [];
  }, [selectedDate, eventsByDay]);

  const pendingRSVPEvents = useMemo(() => {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = endOfWeekFn(weekStart);
    return expandedEvents
      .filter(e => {
        const d = new Date(e.event_date);
        if (isBefore(d, weekStart) || isAfter(d, weekEnd)) return false;
        if (!(isFuture(d) || isToday(d))) return false;
        const att = userAttendance[e.id];
        if (!att) return true;
        if (isRecurring(e) && att.updated_at) return new Date(att.updated_at) < weekStart;
        return false;
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [expandedEvents, userAttendance, currentWeekStart]);

  const listViewEvents = useMemo(() => {
    const now = new Date();
    const end = addDays(now, 30);
    const filtered = activeFilter === 'all' ? locationFilteredEvents : locationFilteredEvents.filter(e => getEventCategory(e.event_type) === activeFilter);
    return filtered.filter(e => { const d = new Date(e.event_date); return !isBefore(d, now) && !isAfter(d, end); })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [locationFilteredEvents, activeFilter]);

  const listViewByDay = useMemo(() => {
    const dayMap = new Map<string, CalendarEvent[]>();
    listViewEvents.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(e);
    });
    const grouped: { date: Date; events: CalendarEvent[] }[] = [];
    dayMap.forEach((evts, key) => grouped.push({ date: parseISO(key), events: evts }));
    return grouped;
  }, [listViewEvents]);

  // ─── Data fetching ───
  const fetchEvents = async () => {
    if (!user) return;
    try {
      const { data: userAssignments } = await supabase.from('calendar_event_assignees').select('event_id').eq('user_id', user.id);
      const assignedEventIds = (userAssignments || []).map(a => a.event_id);
      const { data: eventsData, error } = await supabase.from('calendar_events').select('*').order('event_date', { ascending: true });
      if (error) { console.error('Error fetching events:', error); return; }
      const filteredEvents = (eventsData || []).filter(event => {
        if (event.created_by === user.id || event.manager_id === user.id) return true;
        if (event.is_team_wide) return true;
        if (assignedEventIds.includes(event.id)) return true;
        return false;
      });
      setEvents(filteredEvents);
      const { data: userAttendanceData } = await supabase.from('calendar_attendance').select('event_id, status, updated_at').eq('user_id', user.id);
      const userAttMap: Record<string, { status: 'attending' | 'not_attending'; updated_at: string | null }> = {};
      (userAttendanceData || []).forEach(a => { userAttMap[a.event_id] = { status: a.status as 'attending' | 'not_attending', updated_at: a.updated_at }; });
      setUserAttendance(userAttMap);
      if (isManager && eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: allAttendance } = await supabase.from('calendar_attendance').select('event_id, user_id, status, updated_at').in('event_id', eventIds);
        if (allAttendance && allAttendance.length > 0) {
          const userIds = [...new Set(allAttendance.map(a => a.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
          const attendanceByEvent: Record<string, AttendanceRecord[]> = {};
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

  const fetchTodoEvents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('todo_items').select('id, title, due_date, is_completed, priority').eq('user_id', user.id).not('due_date', 'is', null);
    const todos: CalendarEvent[] = ((data as any[]) || []).filter(t => !t.is_completed && t.due_date).map(t => ({
      id: `todo-${t.id}`, title: `📋 ${t.title}`, description: `Priority: ${t.priority}`,
      event_date: new Date(t.due_date + 'T09:00:00').toISOString(), end_date: null, location: null,
      event_type: 'general', is_team_wide: false, manager_id: null, created_by: user.id, _virtual: true,
    }));
    setTodoEvents(todos);
  }, [user]);

  useEffect(() => { fetchTodoEvents(); }, [fetchTodoEvents]);
  useEffect(() => { fetchEvents(); }, [user, isManager]);

  // ─── Handlers ───
  const handleAttendanceToggle = async (eventId: string, status: 'attending' | 'not_attending') => {
    if (!user) return;
    try {
      const { error } = await supabase.from('calendar_attendance').upsert({ event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
      if (error) { toast.error('Failed to update attendance'); return; }
      setUserAttendance(prev => ({ ...prev, [eventId]: { status, updated_at: new Date().toISOString() } }));
      toast.success(status === 'attending' ? '✅ Marked as attending' : '❌ Marked as not attending');
      if (isManager) fetchEvents();
    } catch { toast.error('Something went wrong'); }
  };

  const handleRSVP = async (status: 'attending' | 'not_attending') => {
    const event = pendingRSVPEvents[attendanceCardIndex];
    if (!event) return;
    await handleAttendanceToggle(event.id, status);
    if (attendanceCardIndex >= pendingRSVPEvents.length - 1) setAttendanceCardIndex(0);
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
          if (eventToDelete.is_team_wide && profile.full_name && user) {
            // Try edge-based downline first, fall back to text-based
            const { data: edgeData, error: edgeErr } = await supabase.rpc('get_downline_from_edges', { _manager_user_id: user.id });
            if (!edgeErr && edgeData && edgeData.length > 0) {
              notifyIds = edgeData.map((d: any) => d.user_id);
            } else {
              const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: profile.full_name });
              notifyIds = downline?.map((d: { user_id: string }) => d.user_id) || [];
            }
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

  const getDisplayStatus = (eventId: string) => userAttendance[eventId]?.status ?? null;

  const formatTimeLocal = (dateStr: string) => {
    const tzShort = getTimezoneShort(timezone);
    return `${formatInTimezone(new Date(dateStr), timezone, 'h:mm a')} ${tzShort}`;
  };

  // ─── Loading ───
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <SummitLoader label="Loading calendar..." />
        </div>
      </AppLayout>
    );
  }

  const currentRSVPEvent = pendingRSVPEvents[attendanceCardIndex];
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayEventCount = (eventsByDay[todayKey] || []).length;

  // ─── Render helpers ───
  const renderEventCard = (event: CalendarEvent, compact = false) => {
    const color = getColor(event.event_type);
    const myStatus = getDisplayStatus(event.id);
    const eventPast = isPast(new Date(event.event_date));
    const isMandatory = getEventCategory(event.event_type) === 'mandatory';
    const wasMissed = eventPast && myStatus !== 'attending' && isMandatory;
    const showTime = hasTime(event.event_date);
    const remote = isRemoteLocation(event.location);

    return (
      <div
        key={event.id}
        className={cn(
          "p-3 rounded-xl cursor-pointer transition-all duration-200 hover:translate-x-0.5 hover:shadow-lg hover:shadow-primary/5",
          "bg-card/60 backdrop-blur-sm border border-border/30",
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
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 uppercase shrink-0">Required</span>
              )}
              {remote !== null && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0", remote ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400")}>
                  {remote ? 'Remote' : 'In Person'}
                </span>
              )}
            </div>
            {!compact && showTime && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-3.5">
                <Clock className="w-3 h-3" />{formatTimeLocal(event.event_date)}{event.end_date && ` – ${formatTimeLocal(event.end_date)}`}
              </p>
            )}
            {!compact && !showTime && <p className="text-xs text-muted-foreground ml-3.5">All day</p>}
            {!compact && event.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 ml-3.5">
                <MapPin className="w-3 h-3" /><span className="break-words">{event.location}</span>
              </p>
            )}
            <div className="mt-1.5 ml-3.5">
              {myStatus === 'attending' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Attending</span>
              ) : myStatus === 'not_attending' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full"><X className="w-3 h-3" /> Not Attending</span>
              ) : wasMissed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full"><X className="w-3 h-3" /> Missed</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
              )}
            </div>
          </div>
          {!eventPast && !compact && (
            <div className="flex gap-0.5 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleAttendanceToggle(event.id, 'attending'); }}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all", myStatus === 'attending' ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10")}
                title="Attending"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); handleAttendanceToggle(event.id, 'not_attending'); }}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all", myStatus === 'not_attending' ? "bg-red-500/20 text-red-400" : "text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10")}
                title="Not attending"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamResponses = () => (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setRsvpSubView('cards')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />Team Responses
        </h2>
      </div>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date))).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No upcoming events</div>
        ) : (
          <div className="divide-y divide-border/30">
            {events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)))
              .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
              .map(event => {
                const eventAtt = attendance[event.id] || [];
                const attending = eventAtt.filter(a => a.status === 'attending');
                const notAttending = eventAtt.filter(a => a.status === 'not_attending');
                const color = getColor(event.event_type);
                return (
                  <details key={event.id} className="group">
                    <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-bold">{format(new Date(event.event_date), 'EEE, MMM d')}</span>
                          {hasTime(event.event_date) && ` · ${formatTimeLocal(event.event_date)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-emerald-400">{attending.length} ✓</span>
                        {notAttending.length > 0 && <span className="text-xs font-bold text-red-400">{notAttending.length} ✗</span>}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                      </div>
                    </summary>
                    <div className="px-5 pb-4">
                      {eventAtt.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 pl-5">No responses yet</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                          {attending.map(a => (
                            <div key={a.user_id} className="flex items-center gap-2 text-xs py-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-foreground font-medium truncate">{a.profile?.full_name || 'Unknown'}</span>
                            </div>
                          ))}
                          {notAttending.map(a => (
                            <div key={a.user_id} className="flex items-center gap-2 text-xs py-1">
                              <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span className="text-muted-foreground truncate">{a.profile?.full_name || 'Unknown'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-5 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,60%,12%)] via-[hsl(225,50%,15%)] to-[hsl(230,40%,10%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217,80%,30%,0.15),transparent_60%)]" />
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />

          <div className="relative z-10">
            <Breadcrumbs items={[{ label: 'Operations', to: '/app/operations' }, { label: 'Calendar' }]} className="mb-3 text-white/50" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Calendar</h1>
                <p className="text-sm text-white/50 mt-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  All times shown in {getTimezoneShort(timezone)} (your local time)
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {isManager && (
                  <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-1.5 h-9 rounded-xl shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" />Event
                  </Button>
                )}
              </div>
            </div>

            {/* Segmented tab control */}
            <div className="mt-4 inline-flex items-center rounded-xl bg-white/[0.06] backdrop-blur-sm p-1 border border-white/[0.08]">
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                  activeTab === 'calendar'
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                <CalendarIcon className="w-4 h-4" />Calendar
              </button>
              <button
                onClick={() => { setActiveTab('attendance'); setAttendanceCardIndex(0); setRsvpSubView('cards'); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative",
                  activeTab === 'attendance'
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                <ListChecks className="w-4 h-4" />Weekly RSVP
                {pendingRSVPEvents.length > 0 && activeTab !== 'attendance' && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {pendingRSVPEvents.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ WEEKLY RSVP TAB ═══ */}
        {activeTab === 'attendance' && (
          <>
            {isManager && rsvpSubView === 'cards' && (
              <div className="flex justify-end mb-3">
                <button onClick={() => setRsvpSubView('responses')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/30">
                  <Eye className="w-3.5 h-3.5" />See Responses
                </button>
              </div>
            )}
            {rsvpSubView === 'responses' && isManager ? renderTeamResponses() : (
              <div className="max-w-md mx-auto">
                {pendingRSVPEvents.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">You're all caught up!</h3>
                    <p className="text-sm text-muted-foreground">No events need your RSVP this week.</p>
                  </div>
                ) : currentRSVPEvent ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">{pendingRSVPEvents.length} remaining this week</span>
                      <div className="flex gap-1">
                        {pendingRSVPEvents.slice(0, 6).map((_, i) => (
                          <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i === attendanceCardIndex ? "bg-primary scale-125" : "bg-muted-foreground/20")} />
                        ))}
                        {pendingRSVPEvents.length > 6 && <span className="text-[10px] text-muted-foreground ml-0.5">+{pendingRSVPEvents.length - 6}</span>}
                      </div>
                    </div>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xl shadow-black/10">
                      <div className={cn("h-1.5 rounded-t-2xl", getEventCategory(currentRSVPEvent.event_type) === 'mandatory' ? "bg-red-500" : "bg-yellow-500")} />
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          {(() => { const cat = getEventCategory(currentRSVPEvent.event_type); const c = CATEGORY_COLORS[cat]; return <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", c.bg, c.text)}>{c.label}</span>; })()}
                        </div>
                        <h2 className="text-xl font-black text-foreground mb-3 leading-tight">{currentRSVPEvent.title}</h2>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-sm text-foreground"><CalendarIcon className="w-4 h-4 text-primary" /><span className="font-bold">{format(new Date(currentRSVPEvent.event_date), 'EEEE, MMMM d')}</span></div>
                          {hasTime(currentRSVPEvent.event_date) ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /><span>{formatTimeLocal(currentRSVPEvent.event_date)}</span>{currentRSVPEvent.end_date && <span>– {formatTimeLocal(currentRSVPEvent.end_date)}</span>}</div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /><span>All day</span></div>
                          )}
                          {currentRSVPEvent.location && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /><span>{currentRSVPEvent.location}</span></div>}
                        </div>
                        {currentRSVPEvent.description && <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{currentRSVPEvent.description}</p>}
                        <div className="flex gap-3">
                          <button onClick={() => handleRSVP('not_attending')} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/10 text-red-400 font-bold text-base hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20"><X className="w-5 h-5" />Can't Make It</button>
                          <button onClick={() => handleRSVP('attending')} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-base hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-500/20"><Check className="w-5 h-5" />I'll Be There</button>
                        </div>
                      </div>
                    </div>
                    {pendingRSVPEvents.length > 1 && (
                      <button onClick={() => setAttendanceCardIndex(prev => (prev + 1) % pendingRSVPEvents.length)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">Skip for now →</button>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        {/* ═══ CALENDAR VIEW ═══ */}
        {activeTab === 'calendar' && (
          <div>
            {/* Filter pills row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(['all', 'mandatory', 'optional'] as EventCategory[]).map(cat => {
                const c = CATEGORY_COLORS[cat];
                return (
                  <button key={cat} onClick={() => { setActiveFilter(cat); if (cat === 'all') setLocationFilter('all'); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200",
                      activeFilter === cat
                        ? cn(c.bg, c.text, "ring-1", c.border, "shadow-sm")
                        : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60"
                    )}>
                    {cat !== 'all' && <span className={cn("w-2 h-2 rounded-full", c.dot)} />}
                    {c.label}
                  </button>
                );
              })}

              <span className="w-px h-5 bg-border/40 mx-0.5" />

              <button onClick={() => setLocationFilter(locationFilter === 'in-person' ? 'all' : 'in-person')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all duration-200",
                  locationFilter === 'in-person'
                    ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30 shadow-sm"
                    : "bg-card/60 text-muted-foreground hover:text-orange-400 border border-border/30 hover:border-orange-500/30"
                )}>
                <Building2 className="w-3 h-3" />In Person
              </button>
              <button onClick={() => setLocationFilter(locationFilter === 'remote' ? 'all' : 'remote')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all duration-200",
                  locationFilter === 'remote'
                    ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 shadow-sm"
                    : "bg-card/60 text-muted-foreground hover:text-purple-400 border border-border/30 hover:border-purple-500/30"
                )}>
                <Video className="w-3 h-3" />Remote
              </button>

              {/* View toggle */}
              <div className="ml-auto flex items-center bg-card/60 rounded-xl p-1 border border-border/30">
                <button onClick={() => setViewMode('grid')}
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Calendar view"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')}
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="List view"><List className="w-4 h-4" /></button>
              </div>
            </div>

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <div className="bg-card rounded-xl border border-border/40 overflow-hidden">
                {listViewByDay.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No upcoming events</div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {listViewByDay.map(({ date, events: dayEvts }) => {
                      const isCurrentDay = isToday(date);
                      return (
                        <div key={format(date, 'yyyy-MM-dd')} className={cn("px-4 py-3.5", isCurrentDay && "bg-primary/[0.04]")}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className={cn("text-sm font-bold", isCurrentDay ? "text-primary" : "text-foreground")}>{format(date, 'EEEE')}</span>
                            <span className="text-xs text-muted-foreground">{format(date, 'MMM d')}</span>
                            {isCurrentDay && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">Today</span>}
                          </div>
                          <div className="space-y-1.5">
                            {dayEvts.map(event => {
                              const color = getColor(event.event_type);
                              const remote = isRemoteLocation(event.location);
                              const showT = hasTime(event.event_date);
                              return (
                                <button key={event.id} onClick={() => setSelectedEvent(event)}
                                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 hover:bg-muted/40 hover:shadow-sm group">
                                  <div className={cn("w-1 h-10 rounded-full flex-shrink-0", color.dot)} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-muted-foreground">{showT ? formatTimeLocal(event.event_date) : 'All day'}</span>
                                      {remote !== null && (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase", remote ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400")}>{remote ? 'Remote' : 'In Person'}</span>
                                      )}
                                    </div>
                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{event.title}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── GRID VIEW ── */}
            {viewMode === 'grid' && (
              <div>
                {/* Month Navigation */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/30 hover:border-primary/30 hover:shadow-sm">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-black text-foreground tracking-tight min-w-[180px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/30 hover:border-primary/30 hover:shadow-sm">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-[11px] font-bold text-muted-foreground/70 py-2 uppercase tracking-widest">{d}</div>
                  ))}
                </div>

                {/* Grid */}
                <TooltipProvider delayDuration={300}>
                  <div className="grid grid-cols-7 gap-1">
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
                            "min-h-[110px] p-1.5 rounded-xl cursor-pointer transition-all duration-200 group relative border",
                            !inMonth && "opacity-30",
                            inMonth && "hover:bg-card/80 hover:shadow-md hover:shadow-primary/[0.03] hover:border-border/60",
                            isSelected && "bg-primary/[0.06] border-primary/30 shadow-md shadow-primary/5",
                            today && !isSelected && "bg-primary/[0.04] border-primary/20 shadow-[0_0_20px_hsl(217,80%,50%,0.06)]",
                            !today && !isSelected && "border-border/20 bg-card/30"
                          )}
                        >
                          <div className="flex items-center justify-between px-0.5 mb-1">
                            <span className={cn(
                              "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                              today && "bg-primary text-primary-foreground font-black shadow-sm shadow-primary/30",
                              !today && inMonth && "text-foreground/80",
                              !inMonth && "text-muted-foreground/30"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {isManager && inMonth && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setPrefillDate(key); setIsFormOpen(true); }}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full hover:bg-primary/20 text-primary transition-all"
                                title="Create event">
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(event => {
                              const cat = getEventCategory(event.event_type);
                              const remote = isRemoteLocation(event.location);
                              const borderColor = cat === 'mandatory' ? 'border-l-red-500' : 'border-l-yellow-500';
                              const displayTitle = truncateTitle(event.title);

                              return (
                                <Tooltip key={event.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                      className={cn(
                                        "w-full text-left text-[10px] leading-snug font-medium px-1.5 py-1 rounded-md transition-all duration-200",
                                        "bg-muted/40 hover:bg-muted/70 hover:shadow-sm hover:-translate-y-px",
                                        "text-foreground/90 border-l-2",
                                        borderColor
                                      )}
                                    >
                                      <span className="flex items-center gap-1">
                                        <span className="truncate flex-1 min-w-0">{displayTitle}</span>
                                        {remote !== null && (
                                          <span className={cn("w-1.5 h-3.5 rounded-sm flex-shrink-0", remote ? "bg-purple-500/70" : "bg-orange-500/70")} />
                                        )}
                                      </span>
                                      {hasTime(event.event_date) && (
                                        <span className="text-[9px] text-muted-foreground/70 block">
                                          {formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}
                                        </span>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[200px]">
                                    <p className="font-semibold text-xs">{event.title}</p>
                                    {hasTime(event.event_date) && <p className="text-[10px] text-muted-foreground">{formatTimeLocal(event.event_date)}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                                className="text-[10px] text-primary font-bold px-1.5 hover:underline"
                              >
                                +{dayEvents.length - 3} more
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>

                {isManager && (
                  <p className="text-[10px] text-muted-foreground/40 mt-2 text-right">Double-click a day to create an event</p>
                )}
              </div>
            )}

            {/* Selected day detail panel */}
            {selectedDate && selectedDayEvents.length > 0 && (
              <div className="mt-5 bg-card rounded-xl border border-border/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {isToday(selectedDate) ? "Today's Events" : format(selectedDate, 'EEEE, MMM d')}
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Close</button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">{selectedDayEvents.map(event => renderEventCard(event))}</div>
              </div>
            )}
          </div>
        )}

        {/* Manager Event Form */}
        <ManagerEventForm isOpen={isFormOpen} onClose={handleFormClose} onSave={fetchEvents} prefillDate={prefillDate}
          event={editingEvent ? { ...editingEvent, description: editingEvent.description || '', location: editingEvent.location || '', event_type: editingEvent.event_type || 'general', assignees: [] } : null} />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this event and notify all assigned team members.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Event Details Modal */}
        {selectedEvent && (
          <EventDetailsModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)}
            onEdit={(event) => { setSelectedEvent(null); handleEditEvent(event); }}
            onDelete={(eventId) => { setSelectedEvent(null); setDeleteEventId(eventId); }}
            canEdit={isAdmin || (isManager && selectedEvent.manager_id === user?.id)} />
        )}
      </main>
    </AppLayout>
  );
}
