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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Users, User, UserCheck, Loader2, Search, Globe, MapPin, Video, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecurrenceSelector, DEFAULT_RECURRENCE, type RecurrenceSettings } from './RecurrenceSelector';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { TIMEZONES } from '@/lib/timezones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
type LocationMode = 'virtual' | 'in_person';

export function ManagerEventForm({ isOpen, onClose, onSave, event }: ManagerEventFormProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationMode, setLocationMode] = useState<LocationMode>('virtual');
  const [locationDetail, setLocationDetail] = useState('');
  const [eventType, setEventType] = useState('general');
  const [isTeamWide, setIsTeamWide] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('entire_team');
  const [memberSearch, setMemberSearch] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(DEFAULT_RECURRENCE);
  const [eventTimezone, setEventTimezone] = useState('');

  // Fetch ALL active members across all teams
  useEffect(() => {
    const fetchAllMembers = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`user_id, full_name, email, avatar_url, team_id, teams:team_id (name)`)
          .neq('status', 'nlc')
          .neq('user_id', user.id)
          .order('full_name');
        
        if (error) { console.error('Error fetching members:', error); return; }

        const userIds = data?.map(d => d.user_id) || [];
        let roleMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
          roleMap = (roles || []).reduce((acc, r) => { acc[r.user_id] = r.role; return acc; }, {} as Record<string, string>);
        }

        setTeamMembers((data || []).map((d: any) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          email: d.email,
          role: roleMap[d.user_id] || 'rookie',
          avatar_url: d.avatar_url,
          team_name: d.teams?.name || 'No Team',
        })));
      } catch (err) { console.error('Error fetching members:', err); }
      setIsLoading(false);
    };
    if (isOpen) fetchAllMembers();
  }, [isOpen, user]);

  // Populate form when editing
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const eventDate = new Date(event.event_date);
      setStartDate(eventDate.toISOString().split('T')[0]);
      const timeStr = eventDate.toTimeString().slice(0, 5);
      if (timeStr !== '00:00') {
        setIncludeTime(true);
        setStartTime(timeStr);
      }
      if (event.end_date) {
        const endD = new Date(event.end_date);
        setEndDate(endD.toISOString().split('T')[0]);
        setEndTime(endD.toTimeString().slice(0, 5));
      }
      // Determine location mode
      const loc = event.location || '';
      if (loc && (loc.toLowerCase().includes('http') || loc.toLowerCase().includes('zoom') || loc.toLowerCase().includes('meet') || loc.toLowerCase().includes('teams'))) {
        setLocationMode('virtual');
        setLocationDetail(loc);
      } else if (loc) {
        setLocationMode('in_person');
        setLocationDetail(loc);
      }
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
    setStartDate('');
    setEndDate('');
    setIncludeTime(false);
    setStartTime('');
    setEndTime('');
    setLocationMode('virtual');
    setLocationDetail('');
    setEventType('general');
    setIsTeamWide(true);
    setSelectedMembers([]);
    setAssignmentMode('entire_team');
    setMemberSearch('');
    setRecurrence(DEFAULT_RECURRENCE);
    setEventTimezone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startDate) {
      toast.error('Please fill in the title and start date');
      return;
    }

    if (!isTeamWide && selectedMembers.length === 0) {
      toast.error('Please select at least one team member or choose team-wide');
      return;
    }

    setIsSaving(true);

    try {
      const eventDateTime = includeTime && startTime
        ? new Date(`${startDate}T${startTime}`)
        : new Date(`${startDate}T00:00:00`);
      
      let endDateTime: Date | null = null;
      if (endDate) {
        endDateTime = includeTime && endTime
          ? new Date(`${endDate}T${endTime}`)
          : new Date(`${endDate}T23:59:59`);
      } else if (includeTime && endTime) {
        endDateTime = new Date(`${startDate}T${endTime}`);
      }

      const locationValue = locationDetail.trim() || null;

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDateTime.toISOString(),
        end_date: endDateTime?.toISOString() || null,
        location: locationValue,
        event_type: eventType,
        is_team_wide: isTeamWide,
        manager_id: user?.id,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
        timezone: eventTimezone || null,
        recurrence_type: recurrence.type !== 'none' ? recurrence.type : null,
        recurrence_interval: recurrence.interval,
        recurrence_days_of_week: recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek : null,
        recurrence_day_of_month: recurrence.dayOfMonth,
        recurrence_end_date: recurrence.endType === 'date' && recurrence.endDate ? new Date(recurrence.endDate).toISOString() : null,
        recurrence_count: recurrence.endType === 'count' ? recurrence.endCount : null,
      } as any;

      let eventId = event?.id;

      if (event?.id) {
        const { error } = await supabase.from('calendar_events').update(eventData).eq('id', event.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('calendar_events').insert(eventData).select().single();
        if (error) throw error;
        eventId = data.id;
      }

      // Handle assignees
      if (!isTeamWide && eventId) {
        await supabase.from('calendar_event_assignees').delete().eq('event_id', eventId);
        if (selectedMembers.length > 0) {
          await supabase.from('calendar_event_assignees').insert(
            selectedMembers.map(userId => ({ event_id: eventId, user_id: userId }))
          );
        }
      }

      // Send notifications
      const usersToNotify = isTeamWide ? teamMembers.map(r => r.user_id) : selectedMembers;
      if (usersToNotify.length > 0) {
        const { error: notifError } = await supabase.functions.invoke('send-calendar-notification', {
          body: {
            event_id: eventId,
            event_title: title,
            event_date: eventDateTime.toISOString(),
            event_location: locationValue || undefined,
            event_description: description || undefined,
            manager_name: profile?.full_name || 'Your manager',
            action: event?.id ? 'updated' : 'created',
            user_ids: usersToNotify
          }
        });
        if (notifError) {
          console.error('Failed to send notifications:', notifError);
          toast.warning('Event saved, but notifications could not be sent.');
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
    setSelectedMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const selectAllByMode = (mode: AssignmentMode) => {
    if (mode === 'entire_team') { setIsTeamWide(true); setSelectedMembers([]); }
    else if (mode === 'managers_only') { setIsTeamWide(false); setSelectedMembers(teamMembers.filter(m => m.role === 'manager' || m.role === 'admin').map(m => m.user_id)); }
    else if (mode === 'rookies_only') { setIsTeamWide(false); setSelectedMembers(teamMembers.filter(m => m.role === 'rookie').map(m => m.user_id)); }
    else { setIsTeamWide(false); }
    setAssignmentMode(mode);
  };

  const filteredMembers = teamMembers.filter(m => {
    if (!memberSearch) return true;
    const query = memberSearch.toLowerCase();
    return m.full_name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query) || (m.team_name?.toLowerCase() || '').includes(query);
  });

  const uniqueTeams = [...new Set(teamMembers.map(m => m.team_name).filter(Boolean))].sort();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event?.id ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title..." required />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {EVENT_TYPES.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
          </div>

          {/* Recurrence - moved up */}
          <div>
            <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Time toggle */}
          <div className="flex items-center justify-between py-1">
            <Label className="text-sm font-medium">Set specific time</Label>
            <Switch checked={includeTime} onCheckedChange={setIncludeTime} />
          </div>

          {includeTime && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Timezone */}
          {includeTime && (
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Timezone
              </label>
              <Select value={eventTimezone} onValueChange={setEventTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location mode */}
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setLocationMode('virtual'); setLocationDetail(''); }}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  locationMode === 'virtual'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Video className="w-4 h-4" />
                Virtual
              </button>
              <button
                type="button"
                onClick={() => { setLocationMode('in_person'); setLocationDetail(''); }}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  locationMode === 'in_person'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <MapPin className="w-4 h-4" />
                In Person
              </button>
            </div>
            {locationMode === 'virtual' ? (
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  placeholder="Paste meeting link (Zoom, Meet, etc.)"
                  className="pl-10"
                />
              </div>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  placeholder="Enter address"
                  className="pl-10"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event details..." className="min-h-[80px]" />
          </div>

          {/* Assignment */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-3">Assign To</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => selectAllByMode('entire_team')} className={cn("flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all", assignmentMode === 'entire_team' ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                <Users className="w-4 h-4" /> Everyone ({teamMembers.length})
              </button>
              <button type="button" onClick={() => selectAllByMode('managers_only')} className={cn("flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all", assignmentMode === 'managers_only' ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                <UserCheck className="w-4 h-4" /> Managers ({teamMembers.filter(m => m.role === 'manager' || m.role === 'admin').length})
              </button>
              <button type="button" onClick={() => selectAllByMode('rookies_only')} className={cn("flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all", assignmentMode === 'rookies_only' ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:border-success/50")}>
                <User className="w-4 h-4" /> Rookies ({teamMembers.filter(m => m.role === 'rookie').length})
              </button>
              <button type="button" onClick={() => selectAllByMode('specific')} className={cn("flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all", assignmentMode === 'specific' ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                <User className="w-4 h-4" /> Select Specific
              </button>
            </div>

            {assignmentMode === 'specific' && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-72 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" placeholder="Search by name, email, or team..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    {uniqueTeams.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
                        {uniqueTeams.slice(0, 4).map(teamName => (
                          <button key={teamName} type="button" onClick={() => {
                            const teamMemberIds = teamMembers.filter(m => m.team_name === teamName).map(m => m.user_id);
                            setSelectedMembers(prev => {
                              const allSelected = teamMemberIds.every(id => prev.includes(id));
                              return allSelected ? prev.filter(id => !teamMemberIds.includes(id)) : [...new Set([...prev, ...teamMemberIds])];
                            });
                          }} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/20 transition-colors">
                            {teamName}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">{filteredMembers.length} of {teamMembers.length} • {selectedMembers.length} selected</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedMembers([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
                        <button type="button" onClick={() => setSelectedMembers(filteredMembers.map(m => m.user_id))} className="text-xs text-primary hover:underline">Select all</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {filteredMembers.map((member) => (
                        <label key={member.user_id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group">
                          <Checkbox checked={selectedMembers.includes(member.user_id)} onCheckedChange={() => toggleMember(member.user_id)} />
                          <UserAvatar avatarUrl={member.avatar_url} fullName={member.full_name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{member.full_name}</span>
                            {member.team_name && <span className="text-[10px] text-muted-foreground">{member.team_name}</span>}
                          </div>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", member.role === 'rookie' ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>) : (event?.id ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
