import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Calendar as CalendarIcon, Plus, Check, X, Users, 
  ChevronLeft, ChevronRight, Clock, Globe, Video, Building2,
  Pencil, Trash2, MapPin, Target, Shield, BarChart3, ListChecks, Eye,
  List, LayoutGrid
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
type LocationFilter = 'all' | 'in-person' | 'remote';

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

/** Detect if an event location is remote/virtual */
const isRemoteLocation = (location: string | null): boolean | null => {
  if (!location) return null;
  const loc = location.toLowerCase();
  return loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('http') || loc.includes('virtual') || loc.includes('remote') || loc.includes('online');
};

/** Check if event_date has a real time (not midnight) */
const hasTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
};

type CalendarTab = 'calendar' | 'attendance' | 'responses';
type CalendarViewMode = 'grid' | 'list';

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
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendar');
  const [attendanceCardIndex, setAttendanceCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('grid');

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';

  // Reset filter when leaving and coming back
  useEffect(() => {
    setActiveFilter('all');
    setActiveTab('calendar');
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

  // Apply location filter
  const locationFilteredEvents = useMemo(() => {
    if (locationFilter === 'all') return expandedEvents;
    return expandedEvents.filter(e => {
      const remote = isRemoteLocation(e.location);
      if (locationFilter === 'remote') return remote === true;
      if (locationFilter === 'in-person') return remote === false;
      return true;
    });
  }, [expandedEvents, locationFilter]);

  // Events by day
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
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  const todayEvents = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM-dd');
    return locationFilteredEvents
      .filter(e => format(new Date(e.event_date), 'yyyy-MM-dd') === key)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [locationFilteredEvents]);

  // Upcoming this week
  const upcomingThisWeek = useMemo(() => {
    const now = new Date();
    const weekEnd = endOfWeekFn(now);
    return locationFilteredEvents
      .filter(e => {
        const d = new Date(e.event_date);
        return (isFuture(d) || isToday(d)) && !isAfter(d, weekEnd);
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 10);
  }, [locationFilteredEvents]);

  // Events needing RSVP (upcoming, not yet responded)
  const pendingRSVPEvents = useMemo(() => {
    return expandedEvents
      .filter(e => {
        const d = new Date(e.event_date);
        return (isFuture(d) || isToday(d)) && !userAttendance[e.id];
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [expandedEvents, userAttendance]);

  // List view: upcoming 30 days of events
  const listViewEvents = useMemo(() => {
    const now = new Date();
    const end = addDays(now, 30);
    const filtered = activeFilter === 'all' ? locationFilteredEvents : locationFilteredEvents.filter(e => getEventCategory(e.event_type) === activeFilter);
    return filtered
      .filter(e => {
        const d = new Date(e.event_date);
        return !isBefore(d, now) && !isAfter(d, end);
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [locationFilteredEvents, activeFilter]);

  // Group list view events by day
  const listViewByDay = useMemo(() => {
    const grouped: { date: Date; events: CalendarEvent[] }[] = [];
    const dayMap = new Map<string, CalendarEvent[]>();
    listViewEvents.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(e);
    });
    dayMap.forEach((evts, key) => {
      grouped.push({ date: parseISO(key), events: evts });
    });
    return grouped;
  }, [listViewEvents]);

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

  useEffect(() => { fetchEvents(); }, [user, isManager]);

  const handleAttendanceToggle = async (eventId: string, status: 'attending' | 'not_attending') => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('calendar_attendance')
        .upsert({ event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
      if (error) { toast.error('Failed to update attendance'); return; }
      setUserAttendance(prev => ({ ...prev, [eventId]: status }));
      toast.success(status === 'attending' ? '✅ Marked as attending' : '❌ Marked as not attending');
      if (isManager) fetchEvents();
    } catch { toast.error('Something went wrong'); }
  };

  const handleRSVP = async (status: 'attending' | 'not_attending') => {
    const event = pendingRSVPEvents[attendanceCardIndex];
    if (!event) return;
    await handleAttendanceToggle(event.id, status);
    if (attendanceCardIndex >= pendingRSVPEvents.length - 1) {
      setAttendanceCardIndex(0);
    }
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

  // Render event card for sidebar / list view
  const renderEventCard = (event: CalendarEvent, compact = false) => {
    const color = getColor(event.event_type);
    const myStatus = userAttendance[event.id];
    const eventPast = isPast(new Date(event.event_date));
    const isMandatory = getEventCategory(event.event_type) === 'mandatory';
    const wasMissed = eventPast && myStatus !== 'attending' && isMandatory;
    const showTime = hasTime(event.event_date);
    const remote = isRemoteLocation(event.location);

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
              {remote !== null && (
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                  remote ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400"
                )}>
                  {remote ? 'Remote' : 'In Person'}
                </span>
              )}
            </div>
            {!compact && showTime && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-3.5">
                <Clock className="w-3 h-3" />
                {formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}
                {event.end_date && ` – ${formatInTimezone(new Date(event.end_date), timezone, 'h:mm a')}`}
              </p>
            )}
            {!compact && !showTime && (
              <p className="text-xs text-muted-foreground ml-3.5">All day</p>
            )}
            {!compact && event.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 ml-3.5">
                <MapPin className="w-3 h-3" />
                <span className="break-words">{event.location}</span>
              </p>
            )}
            <div className="mt-1.5 ml-3.5">
              {myStatus === 'attending' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Attending
                </span>
              ) : myStatus === 'not_attending' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <X className="w-3 h-3" /> Not Attending
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
          {!eventPast && !compact && (
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
  };

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
            {isManager && (
              <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />Event
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
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
            onClick={() => { setActiveTab('attendance'); setAttendanceCardIndex(0); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all relative",
              activeTab === 'attendance'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
            )}
          >
            <ListChecks className="w-4 h-4 inline mr-1.5" />
            RSVP
            {pendingRSVPEvents.length > 0 && activeTab !== 'attendance' && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {pendingRSVPEvents.length}
              </span>
            )}
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('responses')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'responses'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <Eye className="w-4 h-4 inline mr-1.5" />
              Team RSVPs
            </button>
          )}
        </div>

        {/* ═══════════ ATTENDANCE TAB — Tinder-style RSVP ═══════════ */}
        {activeTab === 'attendance' && (
          <div className="max-w-md mx-auto">
            {pendingRSVPEvents.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">You're all caught up!</h3>
                <p className="text-sm text-muted-foreground">No events need your RSVP right now.</p>
              </div>
            ) : currentRSVPEvent ? (
              <div className="space-y-4">
                {/* Progress */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {Object.keys(userAttendance).length} responded · {pendingRSVPEvents.length} remaining
                  </span>
                  <div className="flex gap-1">
                    {pendingRSVPEvents.slice(0, 6).map((_, i) => (
                      <div key={i} className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === attendanceCardIndex ? "bg-primary scale-125" : "bg-muted-foreground/20"
                      )} />
                    ))}
                    {pendingRSVPEvents.length > 6 && <span className="text-[10px] text-muted-foreground ml-0.5">+{pendingRSVPEvents.length - 6}</span>}
                  </div>
                </div>

                {/* Event Card */}
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xl shadow-black/5">
                  <div className={cn(
                    "h-2",
                    getEventCategory(currentRSVPEvent.event_type) === 'mandatory' ? "bg-red-500" : "bg-yellow-500"
                  )} />

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const cat = getEventCategory(currentRSVPEvent.event_type);
                        const c = CATEGORY_COLORS[cat];
                        return (
                          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", c.bg, c.text)}>
                            {c.label}
                          </span>
                        );
                      })()}
                    </div>

                    <h2 className="text-xl font-black text-foreground mb-3 leading-tight">
                      {currentRSVPEvent.title}
                    </h2>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="font-bold">{format(new Date(currentRSVPEvent.event_date), 'EEEE, MMMM d')}</span>
                      </div>
                      {hasTime(currentRSVPEvent.event_date) ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatInTimezone(new Date(currentRSVPEvent.event_date), timezone, 'h:mm a')}</span>
                          {currentRSVPEvent.end_date && (
                            <span>– {formatInTimezone(new Date(currentRSVPEvent.end_date), timezone, 'h:mm a')}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>All day</span>
                        </div>
                      )}
                      {currentRSVPEvent.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{currentRSVPEvent.location}</span>
                        </div>
                      )}
                    </div>

                    {currentRSVPEvent.description && (
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{currentRSVPEvent.description}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRSVP('not_attending')}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/10 text-red-400 font-bold text-base hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20"
                      >
                        <X className="w-5 h-5" />
                        Can't Make It
                      </button>
                      <button
                        onClick={() => handleRSVP('attending')}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-base hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-500/20"
                      >
                        <Check className="w-5 h-5" />
                        I'll Be There
                      </button>
                    </div>
                  </div>
                </div>

                {pendingRSVPEvents.length > 1 && (
                  <button
                    onClick={() => setAttendanceCardIndex(prev => (prev + 1) % pendingRSVPEvents.length)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Skip for now →
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ═══════════ RESPONSES TAB — Manager view ═══════════ */}
        {activeTab === 'responses' && isManager && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Team RSVPs
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">See who's attending each event</p>
            </div>
            {events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date))).length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No upcoming events</div>
            ) : (
              <div className="divide-y divide-border/30">
                {events
                  .filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)))
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
                              {hasTime(event.event_date) && ` · ${formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-success">{attending.length} ✓</span>
                            {notAttending.length > 0 && (
                              <span className="text-xs font-bold text-red-400">{notAttending.length} ✗</span>
                            )}
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
                                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
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
        )}

        {/* ═══════════ CALENDAR VIEW ═══════════ */}
        {activeTab === 'calendar' && (
          <div>
            {/* Today's Events + Upcoming — ABOVE calendar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Today's Events */}
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
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {(selectedDate ? selectedDayEvents : todayEvents).map(event => renderEventCard(event))}
                  </div>
                )}
              </div>

              {/* Upcoming This Week */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Upcoming This Week</h3>
                {upcomingThisWeek.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming events this week</p>
                ) : (
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                    {upcomingThisWeek.map(event => {
                      const color = getColor(event.event_type);
                      const eventDate = new Date(event.event_date);
                      const showT = hasTime(event.event_date);
                      const remote = isRemoteLocation(event.location);
                      return (
                        <button
                          key={`${event.id}-${event.event_date}`}
                          onClick={() => { setSelectedEvent(event); setSelectedDate(eventDate); }}
                          className="w-full text-left flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className={cn("w-1.5 h-8 rounded-full shrink-0", color.dot)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground break-words group-hover:text-primary transition-colors">
                                {event.title}
                              </p>
                              {remote !== null && (
                                <span className={cn(
                                  "text-[9px] font-bold px-1 py-0.5 rounded uppercase shrink-0",
                                  remote ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400"
                                )}>
                                  {remote ? 'Remote' : 'In Person'}
                                </span>
                              )}
                            </div>
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

            {/* Filters row + View toggle */}
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

              {/* Location filters */}
              <span className="w-px h-5 bg-border/50 mx-1" />
              <button
                onClick={() => setLocationFilter(locationFilter === 'in-person' ? 'all' : 'in-person')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all",
                  locationFilter === 'in-person'
                    ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                    : "bg-secondary text-orange-400/70 hover:text-orange-400 border border-border/30"
                )}
              >
                <Building2 className="w-3 h-3" />
                In Person
              </button>
              <button
                onClick={() => setLocationFilter(locationFilter === 'remote' ? 'all' : 'remote')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all",
                  locationFilter === 'remote'
                    ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                    : "bg-secondary text-purple-400/70 hover:text-purple-400 border border-border/30"
                )}
              >
                <Video className="w-3 h-3" />
                Remote
              </button>

              {/* View toggle */}
              <div className="ml-auto flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/30">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'grid' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Calendar view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'list' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {listViewByDay.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No upcoming events</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {listViewByDay.map(({ date, events: dayEvts }) => {
                      const isCurrentDay = isToday(date);
                      return (
                        <div key={format(date, 'yyyy-MM-dd')} className={cn("px-4 py-3", isCurrentDay && "bg-primary/5")}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                              "text-sm font-semibold",
                              isCurrentDay ? "text-primary" : "text-foreground"
                            )}>
                              {format(date, 'EEEE')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(date, 'MMM d')}
                            </span>
                            {isCurrentDay && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {dayEvts.map(event => {
                              const color = getColor(event.event_type);
                              const remote = isRemoteLocation(event.location);
                              const showT = hasTime(event.event_date);
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover:bg-muted/50 group"
                                >
                                  <div className={cn("w-1.5 h-8 rounded-full", color.dot)} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {showT ? formatInTimezone(new Date(event.event_date), timezone, 'h:mm a') : 'All day'}
                                      </span>
                                      {remote !== null && (
                                        <span className={cn(
                                          "text-[9px] font-bold px-1 py-0.5 rounded uppercase",
                                          remote ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400"
                                        )}>
                                          {remote ? 'Remote' : 'In Person'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                      {event.title}
                                    </p>
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
                            const isMand = getEventCategory(event.event_type) === 'mandatory';
                            const remote = isRemoteLocation(event.location);
                            return (
                              <button
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                className="w-full text-left text-[11px] leading-snug font-medium px-1.5 py-[3px] rounded transition-all hover:bg-muted/60 bg-muted/30 text-foreground"
                                title={event.title}
                              >
                                <span className="flex items-center gap-1">
                                  {isMand && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                                  <span className="line-clamp-2 break-words flex-1 min-w-0">{event.title}</span>
                                  {remote !== null && (
                                    <span className={cn(
                                      "w-1.5 h-4 rounded-sm flex-shrink-0",
                                      remote ? "bg-purple-500" : "bg-orange-500"
                                    )} title={remote ? 'Remote' : 'In Person'} />
                                  )}
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

                {isManager && (
                  <p className="text-xs text-muted-foreground/50 mt-2 text-right">
                    Double-click to create
                  </p>
                )}
              </div>
            )}
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
