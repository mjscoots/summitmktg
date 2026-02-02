import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar as CalendarIcon, Plus, Check, X, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isFuture, isPast, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  created_by: string | null;
}

interface Attendance {
  event_id: string;
  user_id: string;
  status: 'attending' | 'not_attending';
  profile?: {
    full_name: string;
  };
}

export default function CalendarPage() {
  const { role, user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({});
  const [userAttendance, setUserAttendance] = useState<Record<string, 'attending' | 'not_attending'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  
  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManager = role === 'manager' || role === 'admin';

  const fetchEvents = async () => {
    if (!user) return;

    try {
      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      setEvents(eventsData || []);

      // Fetch user's own attendance
      const { data: userAttendanceData } = await supabase
        .from('calendar_attendance')
        .select('event_id, status')
        .eq('user_id', user.id);

      const userAttMap: Record<string, 'attending' | 'not_attending'> = {};
      (userAttendanceData || []).forEach(a => {
        userAttMap[a.event_id] = a.status as 'attending' | 'not_attending';
      });
      setUserAttendance(userAttMap);

      // If manager, fetch all attendance with profiles
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
            if (!attendanceByEvent[a.event_id]) {
              attendanceByEvent[a.event_id] = [];
            }
            attendanceByEvent[a.event_id].push({
              ...a,
              status: a.status as 'attending' | 'not_attending',
              profile: profileMap.get(a.user_id)
            });
          });
          setAttendance(attendanceByEvent);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user, isManager]);

  const handleCreateEvent = async () => {
    if (!newTitle.trim() || !newDate || !newTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventDateTime = new Date(`${newDate}T${newTime}`);
      
      const { error } = await supabase.from('calendar_events').insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        event_date: eventDateTime.toISOString(),
        created_by: user?.id,
      });

      if (error) {
        toast.error('Failed to create event');
        return;
      }

      toast.success('Event created!');
      setNewTitle('');
      setNewDescription('');
      setNewDate('');
      setNewTime('');
      setIsCreateOpen(false);
      fetchEvents();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttendanceToggle = async (eventId: string, status: 'attending' | 'not_attending') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_attendance')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });

      if (error) {
        toast.error('Failed to update attendance');
        return;
      }

      setUserAttendance(prev => ({ ...prev, [eventId]: status }));
      toast.success(status === 'attending' ? 'Marked as attending' : 'Marked as not attending');
      
      // Refresh for managers to see updated list
      if (isManager) {
        fetchEvents();
      }
    } catch {
      toast.error('Something went wrong');
    }
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

  const upcomingEvents = events.filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)));
  const pastEvents = events.filter(e => isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date)));

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              Calendar
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upcoming events and attendance tracking
            </p>
          </div>

          {/* Create Event (Managers only) */}
          {isManager && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Event title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateEvent} disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const eventDate = new Date(event.event_date);
                const isEventToday = isToday(eventDate);
                const myStatus = userAttendance[event.id];
                const eventAttendance = attendance[event.id] || [];
                const attending = eventAttendance.filter(a => a.status === 'attending');
                const notAttending = eventAttendance.filter(a => a.status === 'not_attending');
                const isExpanded = expandedEvent === event.id;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-5 rounded-lg border bg-card",
                      isEventToday && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isEventToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                              Today
                            </span>
                          )}
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                        </div>
                        <p className="text-sm text-primary font-medium">
                          {format(eventDate, 'EEEE, MMMM d')} at {format(eventDate, 'h:mm a')}
                        </p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                        )}
                      </div>

                      {/* Attendance Toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAttendanceToggle(event.id, 'attending')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                            myStatus === 'attending'
                              ? "bg-green-500/15 border-green-500/50 text-green-400"
                              : "border-border text-muted-foreground hover:border-green-500/50 hover:text-green-400"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          Attending
                        </button>
                        <button
                          onClick={() => handleAttendanceToggle(event.id, 'not_attending')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                            myStatus === 'not_attending'
                              ? "bg-red-500/15 border-red-500/50 text-red-400"
                              : "border-border text-muted-foreground hover:border-red-500/50 hover:text-red-400"
                          )}
                        >
                          <X className="w-4 h-4" />
                          Not Attending
                        </button>
                      </div>
                    </div>

                    {/* Manager: Attendance List */}
                    {isManager && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>{attending.length} attending, {notAttending.length} not attending</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-green-400 uppercase mb-2">Attending ({attending.length})</h4>
                              {attending.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No responses yet</p>
                              ) : (
                                <ul className="space-y-1">
                                  {attending.map((a) => (
                                    <li key={a.user_id} className="text-sm text-foreground">
                                      {a.profile?.full_name || 'Unknown'}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">Not Attending ({notAttending.length})</h4>
                              {notAttending.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No responses yet</p>
                              ) : (
                                <ul className="space-y-1">
                                  {notAttending.map((a) => (
                                    <li key={a.user_id} className="text-sm text-foreground">
                                      {a.profile?.full_name || 'Unknown'}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">Past Events</h2>
            <div className="space-y-3 opacity-60">
              {pastEvents.slice(0, 5).map((event) => {
                const eventDate = new Date(event.event_date);
                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-border bg-card/50"
                  >
                    <h3 className="font-medium text-foreground">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(eventDate, 'EEEE, MMMM d')} at {format(eventDate, 'h:mm a')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
