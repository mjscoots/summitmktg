import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Calendar as CalendarIcon, Plus, Check, X, Users, 
  ChevronLeft, ChevronRight, Clock, Globe, Video, Building2,
  Pencil, Trash2, MapPin, Flame, Trophy, DollarSign,
  Timer, Target, Zap, TrendingUp, AlertTriangle, Shield,
  BarChart3
} from 'lucide-react';
import { 
  format, isFuture, isPast, isToday, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, 
  addMonths, subMonths, parseISO, differenceInMinutes, differenceInSeconds
} from 'date-fns';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatInTimezone, getTimezoneShort } from '@/lib/timezones';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { Progress } from '@/components/ui/progress';
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

// Execution Command Center event categories
type EventCategory = 'all' | 'mandatory' | 'revenue' | 'training' | 'team' | 'optional';

const EVENT_CATEGORY_MAP: Record<string, EventCategory> = {
  call: 'mandatory',
  deadline: 'mandatory',
  training: 'training',
  meeting: 'revenue',
  general: 'optional',
};

const getEventCategory = (type: string | null): EventCategory => {
  return EVENT_CATEGORY_MAP[type || 'general'] || 'optional';
};

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; dot: string; border: string; label: string; glow?: string }> = {
  all: { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-foreground', border: 'border-foreground', label: 'All' },
  mandatory: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500', label: 'Mandatory', glow: 'shadow-[0_0_8px_-2px_hsl(0,72%,51%/0.4)]' },
  training: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500', label: 'Training' },
  team: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500', label: 'Team' },
  revenue: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500', label: 'Revenue / 1-on-1' },
  optional: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500', border: 'border-yellow-500', label: 'Optional' },
};

const getColor = (type: string | null) => {
  const cat = getEventCategory(type);
  return CATEGORY_COLORS[cat];
};

// Live countdown hook
function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    if (!targetDate) { setTimeLeft(''); return; }
    const tick = () => {
      const now = new Date();
      const diff = differenceInSeconds(targetDate, now);
      if (diff <= 0) { setTimeLeft('NOW'); return; }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  
  return timeLeft;
}

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

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  // Next mandatory event for countdown
  const nextMandatoryEvent = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => {
        const cat = getEventCategory(e.event_type);
        return (cat === 'mandatory' || cat === 'training') && new Date(e.event_date) > now;
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0] || null;
  }, [events]);

  const countdownTarget = nextMandatoryEvent ? new Date(nextMandatoryEvent.event_date) : null;
  const countdown = useCountdown(countdownTarget);

  // Execution score calculation
  const executionScore = useMemo(() => {
    const totalMandatory = events.filter(e => {
      const cat = getEventCategory(e.event_type);
      return (cat === 'mandatory' || cat === 'training') && isPast(new Date(e.event_date));
    }).length;
    if (totalMandatory === 0) return 100;
    const attended = events.filter(e => {
      const cat = getEventCategory(e.event_type);
      return (cat === 'mandatory' || cat === 'training') && isPast(new Date(e.event_date)) && userAttendance[e.id] === 'attending';
    }).length;
    return Math.round((attended / totalMandatory) * 100);
  }, [events, userAttendance]);

  // Attendance streak
  const attendanceStreak = useMemo(() => {
    const pastMandatory = events
      .filter(e => {
        const cat = getEventCategory(e.event_type);
        return (cat === 'mandatory') && isPast(new Date(e.event_date));
      })
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    
    let streak = 0;
    for (const e of pastMandatory) {
      if (userAttendance[e.id] === 'attending') streak++;
      else break;
    }
    return streak;
  }, [events, userAttendance]);

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
    const filtered = activeFilter === 'all' ? events : events.filter(e => {
      const cat = getEventCategory(e.event_type);
      if (activeFilter === 'team') return e.is_team_wide;
      return cat === activeFilter;
    });
    filtered.forEach(e => {
      const key = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
    return map;
  }, [events, activeFilter]);

  // Selected day's events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  // Today's events (unfiltered for execution board)
  const todayEvents = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM-dd');
    const todayAll: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      const k = format(new Date(e.event_date), 'yyyy-MM-dd');
      if (!todayAll[k]) todayAll[k] = [];
      todayAll[k].push(e);
    });
    return (todayAll[key] || []).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events]);

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

  // Fetch team attendance data for manager view
  const fetchTeamAttendance = async () => {
    if (!user || !isManager || !profile?.full_name) return;
    try {
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: profile.full_name });
      if (!downline || downline.length === 0) return;
      
      const userIds = downline.map((d: any) => d.user_id);
      const { data: allAtt } = await supabase
        .from('calendar_attendance')
        .select('user_id, status, event_id')
        .in('user_id', userIds);
      
      const teamData = downline.map((member: any) => {
        const memberAtt = (allAtt || []).filter(a => a.user_id === member.user_id);
        const total = memberAtt.length;
        const attended = memberAtt.filter(a => a.status === 'attending').length;
        const missed = memberAtt.filter(a => a.status === 'not_attending').length;
        const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
        return {
          ...member,
          attendance_pct: pct,
          attended,
          missed,
          total,
          execution_score: pct,
        };
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
          <div className="animate-pulse text-muted-foreground">Loading command center...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* ═══ TOP BAR: Execution Overview Strip ═══ */}
        <div className="mb-5 rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-stretch">
            {/* Left: Title */}
            <div className="flex items-center gap-3 px-5 py-3 border-b lg:border-b-0 lg:border-r border-border/40 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">EXECUTION COMMAND CENTER</h1>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  {getTimezoneShort(timezone)}
                </span>
              </div>
            </div>

            {/* Center: Countdown */}
            <div className="flex-1 flex items-center justify-center gap-3 px-5 py-3 border-b lg:border-b-0 lg:border-r border-border/40">
              {nextMandatoryEvent ? (
                <div className="flex items-center gap-3">
                  <Timer className="w-4 h-4 text-red-400 animate-pulse" />
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Next Mandatory</p>
                    <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{nextMandatoryEvent.title}</p>
                    <p className={cn(
                      "text-lg font-black tracking-tight tabular-nums",
                      countdown === 'NOW' ? "text-red-400 animate-pulse" : "text-primary"
                    )}>
                      {countdown}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No upcoming mandatory events</p>
              )}
            </div>

            {/* Right: Status Badges */}
            <div className="flex items-center gap-3 px-5 py-3 flex-wrap justify-center lg:justify-end">
              {/* Execution Score */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                executionScore >= 90 ? "border-emerald-500/30 bg-emerald-500/5" :
                executionScore < 70 ? "border-red-500/30 bg-red-500/5" :
                "border-yellow-500/30 bg-yellow-500/5"
              )}>
                <Zap className={cn("w-3.5 h-3.5", 
                  executionScore >= 90 ? "text-emerald-400" : executionScore < 70 ? "text-red-400" : "text-yellow-400"
                )} />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Execution</p>
                  <p className={cn("text-sm font-black tabular-nums",
                    executionScore >= 90 ? "text-emerald-400" : executionScore < 70 ? "text-red-400" : "text-yellow-400"
                  )}>
                    {executionScore}%
                    {executionScore >= 90 && <Flame className="w-3 h-3 inline ml-0.5 text-orange-400" />}
                  </p>
                </div>
              </div>

              {/* Revenue Progress (placeholder) */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</p>
                  <p className="text-sm font-black text-purple-400 tabular-nums">—</p>
                </div>
              </div>

              {/* Leaderboard Rank (placeholder) */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Rank</p>
                  <p className="text-sm font-black text-primary tabular-nums">—</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manager tab strip */}
        {isManager && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'calendar'
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_-3px_hsl(var(--primary)/0.5)]"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5 inline mr-1.5" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('team_attendance')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'team_attendance'
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_-3px_hsl(var(--primary)/0.5)]"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <Users className="w-3.5 h-3.5 inline mr-1.5" />
              Team Attendance
            </button>
            <div className="flex-1" />
            {activeTab === 'calendar' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-8">Today</Button>
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-1.5 h-8">
                  <Plus className="w-3.5 h-3.5" />Event
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Non-manager header */}
        {!isManager && (
          <div className="flex items-center justify-between mb-4">
            <div />
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-8">Today</Button>
          </div>
        )}

        {/* ═══ TEAM ATTENDANCE TAB (Manager Only) ═══ */}
        {activeTab === 'team_attendance' && isManager && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Team Compliance Overview
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sorted by lowest compliance first</p>
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
                      <p className="text-[11px] text-muted-foreground capitalize">{member.role} · {member.team_name || 'No Team'}</p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
                      <p className={cn("text-sm font-black tabular-nums",
                        member.attendance_pct >= 90 ? "text-emerald-400" :
                        member.attendance_pct < 70 ? "text-red-400" : "text-yellow-400"
                      )}>
                        {member.attendance_pct}%
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Missed</p>
                      <p className={cn("text-sm font-bold tabular-nums",
                        member.missed > 0 ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {member.missed}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
                      <p className={cn("text-sm font-black tabular-nums flex items-center gap-0.5",
                        member.execution_score >= 90 ? "text-emerald-400" :
                        member.execution_score < 70 ? "text-red-400" : "text-yellow-400"
                      )}>
                        {member.execution_score}
                        {member.execution_score >= 90 && <Flame className="w-3 h-3 text-orange-400" />}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CALENDAR VIEW ═══ */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            {/* Main Calendar Grid */}
            <div>
              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {(['all', 'mandatory', 'revenue', 'training', 'team', 'optional'] as EventCategory[]).map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all",
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

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-foreground tracking-tight">
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
                        "min-h-[90px] p-1 border-b border-r border-border/30 cursor-pointer transition-colors group relative",
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
                          const isMandatory = getEventCategory(event.event_type) === 'mandatory';
                          return (
                            <button
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                              className={cn(
                                "w-full text-left text-[10px] leading-tight font-medium px-1.5 py-[3px] rounded truncate transition-all hover:brightness-110",
                                color.bg, color.text,
                                isMandatory && "ring-1 ring-red-500/20"
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
                {(['mandatory', 'training', 'revenue', 'team', 'optional'] as EventCategory[]).map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <span key={cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                      {c.label}
                    </span>
                  );
                })}
                {isManager && (
                  <span className="text-[11px] text-muted-foreground/50 ml-auto">
                    Double-click to create
                  </span>
                )}
              </div>
            </div>

            {/* ═══ RIGHT PANEL: Today's Execution Board ═══ */}
            <div className="space-y-4">
              {/* Section A: Today's Execution */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  {selectedDate ? (
                    isToday(selectedDate)
                      ? "Today's Execution"
                      : format(selectedDate, 'EEEE, MMM d')
                  ) : "Today's Execution"}
                </h3>

                {(selectedDate ? selectedDayEvents : todayEvents).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">No events scheduled</p>
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

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-lg border-l-[3px] cursor-pointer transition-all hover:translate-x-0.5",
                            "bg-background border border-border/40",
                            `border-l-${color.dot.replace('bg-', '')}`,
                            wasMissed && "ring-1 ring-red-500/20 bg-red-500/[0.03]"
                          )}
                          style={{ borderLeftColor: `var(--${color.dot.includes('red') ? 'destructive' : color.dot.includes('blue') ? 'primary' : color.dot.includes('emerald') ? 'success' : color.dot.includes('purple') ? 'ring' : 'warning'})` }}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                                {isMandatory && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 uppercase shrink-0">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatInTimezone(new Date(event.event_date), timezone, 'h:mm a')}
                                {event.end_date && ` – ${formatInTimezone(new Date(event.end_date), timezone, 'h:mm a')}`}
                              </p>
                              {/* Status badge */}
                              <div className="mt-1.5">
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

                            {/* Quick RSVP */}
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

              {/* Section B: Revenue Context (Placeholder) */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  Revenue Context
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Current Revenue</span>
                    <span className="text-sm font-bold text-foreground">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Next Bracket</span>
                    <span className="text-sm font-bold text-purple-400">—</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground/60 text-center">Connect revenue tracking to activate</p>
                </div>
              </div>

              {/* Section C: Attendance Streak */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Attendance Streak
                </h3>
                <div className="text-center py-2">
                  <p className={cn(
                    "text-3xl font-black tabular-nums",
                    attendanceStreak >= 5 ? "text-orange-400" :
                    attendanceStreak === 0 ? "text-red-400" : "text-foreground"
                  )}>
                    {attendanceStreak}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {attendanceStreak === 0 ? 'Streak broken — rebuild it' : 
                     attendanceStreak >= 10 ? '🔥 Unstoppable!' :
                     attendanceStreak >= 5 ? 'Keep the fire burning' :
                     'consecutive mandatory events'}
                  </p>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Upcoming</h3>
                {events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date))).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
                ) : (
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
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
