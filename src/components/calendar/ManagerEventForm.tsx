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
import { Users, User, UserCheck, Loader2, Search, Globe, MapPin, Video, Link2, CalendarPlus, Clock, Type, Tag, Repeat, MapPinned, FileText, UserPlus } from 'lucide-react';
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
  prefillDate?: string | null;
}

const EVENT_TYPES = [
  { value: 'general', label: 'General', icon: '📋' },
  { value: 'training', label: 'Training', icon: '📚' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'deadline', label: 'Deadline', icon: '⏰' },
  { value: 'call', label: 'Team Call', icon: '📞' },
];

type AssignmentMode = 'entire_team' | 'managers_only' | 'rookies_only' | 'specific';
type LocationMode = 'virtual' | 'in_person';

// Step indicator component
function StepSection({ icon: Icon, title, children, className }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function ManagerEventForm({ isOpen, onClose, onSave, event, prefillDate }: ManagerEventFormProps) {
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

        setTeamMembers((data || []).map((d) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          email: d.email,
          role: roleMap[d.user_id] || 'rookie',
          avatar_url: d.avatar_url,
          team_name: (d.teams as { name: string } | null)?.name || 'No Team',
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
      // Apply prefill date when creating new event
      if (prefillDate) {
        setStartDate(prefillDate);
      }
    }
  }, [event, prefillDate]);

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

      if (!isTeamWide && eventId) {
        await supabase.from('calendar_event_assignees').delete().eq('event_id', eventId);
        if (selectedMembers.length > 0) {
          await supabase.from('calendar_event_assignees').insert(
            selectedMembers.map(userId => ({ event_id: eventId, user_id: userId }))
          );
        }
      }

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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/50 bg-card">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border/50 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <CalendarPlus className="w-4 h-4 text-primary" />
              </div>
              {event?.id ? 'Edit Event' : 'New Event'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          
          {/* ── Section 1: Basics ── */}
          <StepSection icon={Type} title="Details">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Event name" 
              required 
              className="h-11 text-base bg-background/50 border-border/40 focus:border-primary/50 transition-colors"
            />

            {/* Event type chips */}
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    eventType === type.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Add details (optional)" 
              className="min-h-[72px] resize-none bg-background/50 border-border/40 focus:border-primary/50 transition-colors text-sm"
            />
          </StepSection>

          <div className="border-t border-border/30" />

          {/* ── Section 2: When ── */}
          <StepSection icon={Clock} title="When">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="bg-background/50 border-border/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background/50 border-border/40" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
              <Label className="text-xs font-medium text-muted-foreground">Add specific time</Label>
              <Switch checked={includeTime} onCheckedChange={setIncludeTime} />
            </div>

            {includeTime && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background/50 border-border/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background/50 border-border/40" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Timezone
                  </Label>
                  <Select value={eventTimezone} onValueChange={setEventTimezone}>
                    <SelectTrigger className="bg-background/50 border-border/40">
                      <SelectValue placeholder="Select timezone (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
          </StepSection>

          <div className="border-t border-border/30" />

          {/* ── Section 3: Where ── */}
          <StepSection icon={MapPinned} title="Where">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setLocationMode('virtual'); setLocationDetail(''); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all",
                  locationMode === 'virtual'
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <Video className="w-3.5 h-3.5" /> Virtual
              </button>
              <button
                type="button"
                onClick={() => { setLocationMode('in_person'); setLocationDetail(''); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all",
                  locationMode === 'in_person'
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <MapPin className="w-3.5 h-3.5" /> In Person
              </button>
            </div>
            <div className="relative">
              {locationMode === 'virtual' ? (
                <>
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="Paste meeting link..." className="pl-10 bg-background/50 border-border/40" />
                </>
              ) : (
                <>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="Enter address..." className="pl-10 bg-background/50 border-border/40" />
                </>
              )}
            </div>
          </StepSection>

          <div className="border-t border-border/30" />

          {/* ── Section 4: Who ── */}
          <StepSection icon={UserPlus} title="Invite">
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'entire_team' as AssignmentMode, icon: Users, label: 'Everyone', count: teamMembers.length },
                { mode: 'managers_only' as AssignmentMode, icon: UserCheck, label: 'Managers', count: teamMembers.filter(m => m.role === 'manager' || m.role === 'admin').length },
                { mode: 'rookies_only' as AssignmentMode, icon: User, label: 'Rookies', count: teamMembers.filter(m => m.role === 'rookie').length },
                { mode: 'specific' as AssignmentMode, icon: Search, label: 'Custom', count: selectedMembers.length },
              ].map(({ mode, icon: ModeIcon, label, count }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => selectAllByMode(mode)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                    assignmentMode === mode
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <ModeIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  <span className={cn(
                    "ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                    assignmentMode === mode ? "bg-primary/20" : "bg-muted"
                  )}>{count}</span>
                </button>
              ))}
            </div>

            {assignmentMode === 'specific' && (
              <div className="rounded-lg border border-border/40 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-2.5 bg-muted/20 border-b border-border/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or team..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-background/80 border border-border/40 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No members found</p>
                ) : (
                  <>
                    {uniqueTeams.length > 1 && (
                      <div className="flex flex-wrap gap-1 px-2.5 py-2 border-b border-border/20">
                        {uniqueTeams.slice(0, 4).map(teamName => (
                          <button key={teamName} type="button" onClick={() => {
                            const teamMemberIds = teamMembers.filter(m => m.team_name === teamName).map(m => m.user_id);
                            setSelectedMembers(prev => {
                              const allSelected = teamMemberIds.every(id => prev.includes(id));
                              return allSelected ? prev.filter(id => !teamMemberIds.includes(id)) : [...new Set([...prev, ...teamMemberIds])];
                            });
                          }} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-primary/20 transition-colors">
                            {teamName}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center px-2.5 py-1.5 bg-muted/10">
                      <span className="text-[10px] text-muted-foreground">{filteredMembers.length} members · {selectedMembers.length} selected</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedMembers([])} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear</button>
                        <button type="button" onClick={() => setSelectedMembers(filteredMembers.map(m => m.user_id))} className="text-[10px] text-primary hover:text-primary/80 transition-colors">All</button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/10">
                      {filteredMembers.map((member) => (
                        <label key={member.user_id} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-muted/30 cursor-pointer transition-colors">
                          <Checkbox checked={selectedMembers.includes(member.user_id)} onCheckedChange={() => toggleMember(member.user_id)} className="shrink-0" />
                          <UserAvatar avatarUrl={member.avatar_url} fullName={member.full_name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium truncate block text-foreground">{member.full_name}</span>
                            {member.team_name && <span className="text-[10px] text-muted-foreground">{member.team_name}</span>}
                          </div>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            member.role === 'rookie' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                          )}>
                            {member.role === 'rookie' ? 'Rookie' : 'Mgr'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </StepSection>

          {/* ── Actions ── */}
          <div className="sticky bottom-0 bg-card pt-3 pb-1 border-t border-border/30 -mx-6 px-6 flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-[2] h-10 text-sm font-semibold">
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
              ) : (
                event?.id ? 'Save Changes' : 'Create Event'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
