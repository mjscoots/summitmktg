import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
 import { Calendar as CalendarIcon, Plus, Check, X, Users, ChevronDown, ChevronUp, Pencil, Trash2, MapPin, Clock, ChevronRight } from 'lucide-react';
import { format, isFuture, isPast, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
 import { WeeklyOutlook } from '@/components/calendar/WeeklyOutlook';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  const { role, user, profile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({});
  const [userAttendance, setUserAttendance] = useState<Record<string, 'attending' | 'not_attending'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const isManager = role === 'manager' || role === 'admin';

  const fetchEvents = async () => {
    if (!user) return;

    try {
      // Fetch all events (RLS will filter appropriately)
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
      
      if (isManager) {
        fetchEvents();
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;

    try {
      // Send notification before deleting
      const eventToDelete = events.find(e => e.id === deleteEventId);
      if (eventToDelete && profile) {
        // Get users to notify
        const { data: assignees } = await supabase
          .from('calendar_event_assignees')
          .select('user_id')
          .eq('event_id', deleteEventId);

        const userIds = assignees?.map(a => a.user_id) || [];
        
        if (userIds.length > 0 || eventToDelete.is_team_wide) {
          // If team-wide, get all downline
          let notifyIds = userIds;
          if (eventToDelete.is_team_wide && profile.full_name) {
            const { data: downline } = await supabase.rpc('get_user_downline', { 
              _manager_name: profile.full_name 
            });
            notifyIds = downline?.map((d: { user_id: string }) => d.user_id) || [];
          }

          if (notifyIds.length > 0) {
            await supabase.functions.invoke('send-calendar-notification', {
              body: {
                event_id: deleteEventId,
                event_title: eventToDelete.title,
                event_date: eventToDelete.event_date,
                manager_name: profile.full_name || 'Your manager',
                action: 'deleted',
                user_ids: notifyIds
              }
            });
          }
        }
      }

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', deleteEventId);

      if (error) throw error;

      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeleteEventId(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const getEventTypeBadge = (type: string | null) => {
    const types: Record<string, { label: string; class: string }> = {
      training: { label: 'Training', class: 'bg-blue-500/15 text-blue-400' },
      meeting: { label: 'Meeting', class: 'bg-purple-500/15 text-purple-400' },
      deadline: { label: 'Deadline', class: 'bg-red-500/15 text-red-400' },
      call: { label: 'Team Call', class: 'bg-green-500/15 text-green-400' },
      general: { label: 'General', class: 'bg-muted text-muted-foreground' },
    };
    const eventType = types[type || 'general'] || types.general;
    return (
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase', eventType.class)}>
        {eventType.label}
      </span>
    );
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
              {isManager ? 'Manage events for your team' : 'Upcoming events and attendance tracking'}
            </p>
          </div>

          {isManager && (
            <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          )}
        </div>

         {/* Weekly Outlook */}
         <WeeklyOutlook 
           events={upcomingEvents}
           userTeamId={profile?.team_id || null}
         />

        {/* Upcoming Events */}
        <div className="mb-8">
           <h2 className="text-lg font-semibold text-foreground mb-4">All Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming events</p>
              {isManager && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first event
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const eventDate = new Date(event.event_date);
                const endDate = event.end_date ? new Date(event.end_date) : null;
                const isEventToday = isToday(eventDate);
                const myStatus = userAttendance[event.id];
                const eventAttendance = attendance[event.id] || [];
                const attending = eventAttendance.filter(a => a.status === 'attending');
                const notAttending = eventAttendance.filter(a => a.status === 'not_attending');
                const isExpanded = expandedEvent === event.id;
                const canEdit = isManager && event.manager_id === user?.id;

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isEventToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                              Today
                            </span>
                          )}
                          {getEventTypeBadge(event.event_type)}
                          {event.is_team_wide && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Team
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground text-lg mt-2">{event.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1.5 text-primary font-medium">
                            <Clock className="w-4 h-4" />
                            {format(eventDate, 'EEEE, MMM d')} at {format(eventDate, 'h:mm a')}
                            {endDate && ` - ${format(endDate, 'h:mm a')}`}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-3">{event.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 items-end">
                        {canEdit && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteEventId(event.id)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        <AddToCalendarButton
                          title={event.title}
                          startDate={eventDate}
                          endDate={endDate || undefined}
                          location={event.location || undefined}
                          description={event.description || undefined}
                          organizer={profile?.full_name}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Attendance Toggle */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">Your response:</span>
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
                    <div className="flex items-center gap-2 mb-1">
                      {getEventTypeBadge(event.event_type)}
                    </div>
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

        {/* Manager Event Form */}
        <ManagerEventForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSave={fetchEvents}
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
      </main>
    </AppLayout>
  );
}
