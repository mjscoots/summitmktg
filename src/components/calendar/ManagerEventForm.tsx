import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Users, User, UserCheck, Loader2, Search, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecurrenceSelector, DEFAULT_RECURRENCE, toRRule, type RecurrenceSettings } from './RecurrenceSelector';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  team_name?: string;
}

interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  event_date: string;
  end_date?: string;
  location: string;
  event_type: string;
  is_team_wide: boolean;
  assignees: string[];
}

interface ManagerEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: CalendarEvent | null;
}

const EVENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'call', label: 'Team Call' },
];

type AssignmentMode = 'entire_team' | 'managers_only' | 'rookies_only' | 'specific';

export function ManagerEventForm({ isOpen, onClose, onSave, event }: ManagerEventFormProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('general');
  const [isTeamWide, setIsTeamWide] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('entire_team');
  const [memberSearch, setMemberSearch] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(DEFAULT_RECURRENCE);
  const [eventTimezone, setEventTimezone] = useState(DEFAULT_TIMEZONE);

  // Fetch ALL active members across all teams (not team-filtered)
  useEffect(() => {
    const fetchAllMembers = async () => {
      if (!user) return;
      
      setIsLoading(true);

      try {
        // Get ALL active profiles across the entire organization
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            user_id,
            full_name,
            email,
            avatar_url,
            team_id,
            teams:team_id (name)
          `)
          .neq('status', 'nlc')
          .neq('user_id', user.id) // Exclude current user
          .order('full_name');
        
        if (error) {
          console.error('Error fetching members:', error);
          return;
        }

        // Get roles for all users
        const userIds = data?.map(d => d.user_id) || [];
        let roleMap: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);
          
          roleMap = (roles || []).reduce((acc, r) => {
            acc[r.user_id] = r.role;
            return acc;
          }, {} as Record<string, string>);
        }

        setTeamMembers((data || []).map((d: any) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          email: d.email,
          role: roleMap[d.user_id] || 'rookie',
          avatar_url: d.avatar_url,
          team_name: d.teams?.name || 'No Team',
        })));
      } catch (err) {
        console.error('Error fetching members:', err);
      }
      
      setIsLoading(false);
    };

    if (isOpen) {
      fetchAllMembers();
    }
  }, [isOpen, user]);

  // Populate form when editing
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const eventDate = new Date(event.event_date);
      setDate(eventDate.toISOString().split('T')[0]);
      setTime(eventDate.toTimeString().slice(0, 5));
      if (event.end_date) {
        setEndTime(new Date(event.end_date).toTimeString().slice(0, 5));
      }
      setLocation(event.location || '');
      setEventType(event.event_type || 'general');
      setIsTeamWide(event.is_team_wide);
      setSelectedMembers(event.assignees || []);
      setAssignmentMode(event.is_team_wide ? 'entire_team' : 'specific');
    } else {
      resetForm();
    }
  }, [event]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setEndTime('');
    setLocation('');
    setEventType('general');
    setIsTeamWide(true);
    setSelectedMembers([]);
    setAssignmentMode('entire_team');
    setMemberSearch('');
    setRecurrence(DEFAULT_RECURRENCE);
    setEventTimezone(DEFAULT_TIMEZONE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !date || !time) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!isTeamWide && selectedMembers.length === 0) {
      toast.error('Please select at least one team member or choose team-wide');
      return;
    }

    setIsSaving(true);

    try {
      const eventDateTime = new Date(`${date}T${time}`);
      const endDateTime = endTime ? new Date(`${date}T${endTime}`) : null;

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDateTime.toISOString(),
        end_date: endDateTime?.toISOString() || null,
        location: location.trim() || null,
        event_type: eventType,
        is_team_wide: isTeamWide,
        manager_id: user?.id,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
        timezone: eventTimezone,
        // Recurrence fields
        recurrence_type: recurrence.type !== 'none' ? recurrence.type : null,
        recurrence_interval: recurrence.interval,
        recurrence_days_of_week: recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek : null,
        recurrence_day_of_month: recurrence.dayOfMonth,
        recurrence_end_date: recurrence.endType === 'date' && recurrence.endDate 
          ? new Date(recurrence.endDate).toISOString() 
          : null,
        recurrence_count: recurrence.endType === 'count' ? recurrence.endCount : null,
      } as any;

      let eventId = event?.id;

      if (event?.id) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', event.id);
        
        if (error) throw error;
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('calendar_events')
          .insert(eventData)
          .select()
          .single();
        
        if (error) throw error;
        eventId = data.id;
      }

      // Handle assignees for non-team-wide events
      if (!isTeamWide && eventId) {
        // Delete existing assignees
        await supabase
          .from('calendar_event_assignees')
          .delete()
          .eq('event_id', eventId);
        
        // Insert new assignees
        if (selectedMembers.length > 0) {
          const assigneeRecords = selectedMembers.map(userId => ({
            event_id: eventId,
            user_id: userId
          }));
          
          await supabase
            .from('calendar_event_assignees')
            .insert(assigneeRecords);
        }
      }

      // Send notifications
      const usersToNotify = isTeamWide 
        ? teamMembers.map(r => r.user_id) 
        : selectedMembers;

      if (usersToNotify.length > 0) {
        const { data: notifResponse, error: notifError } = await supabase.functions.invoke('send-calendar-notification', {
          body: {
            event_id: eventId,
            event_title: title,
            event_date: eventDateTime.toISOString(),
            event_location: location || undefined,
            event_description: description || undefined,
            manager_name: profile?.full_name || 'Your manager',
            action: event?.id ? 'updated' : 'created',
            user_ids: usersToNotify
          }
        });

        if (notifError) {
          console.error('Failed to send notifications:', notifError);
          toast.warning('Event saved, but notifications could not be sent. Assigned members were not notified.');
        } else if (notifResponse?.notifications_sent?.errors?.length > 0) {
          console.error('Some notifications failed:', notifResponse.notifications_sent.errors);
          toast.warning('Event saved, but some notifications failed to send.');
        }
      }

      toast.success(event?.id ? 'Event updated!' : 'Event created!');
      onSave();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllByMode = (mode: AssignmentMode) => {
    if (mode === 'entire_team') {
      setIsTeamWide(true);
      setSelectedMembers([]);
    } else if (mode === 'managers_only') {
      setIsTeamWide(false);
      setSelectedMembers(teamMembers.filter(m => m.role === 'manager' || m.role === 'admin').map(m => m.user_id));
    } else if (mode === 'rookies_only') {
      setIsTeamWide(false);
      setSelectedMembers(teamMembers.filter(m => m.role === 'rookie').map(m => m.user_id));
    } else {
      setIsTeamWide(false);
    }
    setAssignmentMode(mode);
  };

  // Filter members by search
  const filteredMembers = teamMembers.filter(m => {
    if (!memberSearch) return true;
    const query = memberSearch.toLowerCase();
    return m.full_name.toLowerCase().includes(query) ||
           m.email.toLowerCase().includes(query) ||
           (m.team_name?.toLowerCase() || '').includes(query);
  });

  // Get unique teams for quick select
  const uniqueTeams = [...new Set(teamMembers.map(m => m.team_name).filter(Boolean))].sort();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event?.id ? 'Edit Event' : 'Create Event for Your Team'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
              required
            />
          </div>

          {/* Date/Time Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Start *</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Zoom, Office, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              Timezone *
            </label>
            <Select value={eventTimezone} onValueChange={setEventTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
              className="min-h-[80px]"
            />
          </div>

          {/* Assignment */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-3">Assign To</label>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => selectAllByMode('entire_team')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  assignmentMode === 'entire_team' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Users className="w-4 h-4" />
                Everyone ({teamMembers.length})
              </button>
              <button
                type="button"
                onClick={() => selectAllByMode('managers_only')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  assignmentMode === 'managers_only' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <UserCheck className="w-4 h-4" />
                Managers ({teamMembers.filter(m => m.role === 'manager' || m.role === 'admin').length})
              </button>
              <button
                type="button"
                onClick={() => selectAllByMode('rookies_only')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  assignmentMode === 'rookies_only' 
                    ? "border-success bg-success/10 text-success" 
                    : "border-border text-muted-foreground hover:border-success/50"
                )}
              >
                <User className="w-4 h-4" />
                Rookies ({teamMembers.filter(m => m.role === 'rookie').length})
              </button>
              <button
                type="button"
                onClick={() => selectAllByMode('specific')}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  assignmentMode === 'specific' 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <User className="w-4 h-4" />
                Select Specific
              </button>
            </div>

            {assignmentMode === 'specific' && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-72 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members found
                  </p>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or team..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    
                    {/* Quick select by team */}
                    {uniqueTeams.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
                        {uniqueTeams.slice(0, 4).map(teamName => (
                          <button
                            key={teamName}
                            type="button"
                            onClick={() => {
                              const teamMemberIds = teamMembers
                                .filter(m => m.team_name === teamName)
                                .map(m => m.user_id);
                              setSelectedMembers(prev => {
                                const allSelected = teamMemberIds.every(id => prev.includes(id));
                                if (allSelected) {
                                  return prev.filter(id => !teamMemberIds.includes(id));
                                }
                                return [...new Set([...prev, ...teamMemberIds])];
                              });
                            }}
                            className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/20 transition-colors"
                          >
                            {teamName}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">
                        {filteredMembers.length} of {teamMembers.length} • {selectedMembers.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMembers([])}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMembers(filteredMembers.map(m => m.user_id))}
                          className="text-xs text-primary hover:underline"
                        >
                          Select all
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {filteredMembers.map((member) => (
                        <label
                          key={member.user_id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(member.user_id)}
                            onCheckedChange={() => toggleMember(member.user_id)}
                          />
                          <UserAvatar 
                            avatarUrl={member.avatar_url} 
                            fullName={member.full_name} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{member.full_name}</span>
                            {member.team_name && (
                              <span className="text-[10px] text-muted-foreground">{member.team_name}</span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            member.role === 'rookie' 
                              ? "bg-success/10 text-success" 
                              : "bg-primary/10 text-primary"
                          )}>
                            {member.role === 'rookie' ? 'Rookie' : 'Manager'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Recurrence Settings */}
          <div className="border-t border-border pt-4">
            <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                event?.id ? 'Update Event' : 'Create Event'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
