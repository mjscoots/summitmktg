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
import { Users, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Rookie {
  user_id: string;
  full_name: string;
  email: string;
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

export function ManagerEventForm({ isOpen, onClose, onSave, event }: ManagerEventFormProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rookies, setRookies] = useState<Rookie[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('general');
  const [isTeamWide, setIsTeamWide] = useState(true);
  const [selectedRookies, setSelectedRookies] = useState<string[]>([]);

  // Fetch manager's downline
  useEffect(() => {
    const fetchRookies = async () => {
      if (!profile?.full_name) return;
      
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_downline', { _manager_name: profile.full_name });
      
      if (!error && data) {
        setRookies(data.map((d: { user_id: string; full_name: string; email: string }) => ({
          user_id: d.user_id,
          full_name: d.full_name,
          email: d.email
        })));
      }
      setIsLoading(false);
    };

    if (isOpen) {
      fetchRookies();
    }
  }, [isOpen, profile?.full_name]);

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
      setSelectedRookies(event.assignees || []);
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
    setSelectedRookies([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !date || !time) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!isTeamWide && selectedRookies.length === 0) {
      toast.error('Please select at least one rookie or choose team-wide');
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
        updated_at: new Date().toISOString()
      };

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
        if (selectedRookies.length > 0) {
          const assigneeRecords = selectedRookies.map(userId => ({
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
        ? rookies.map(r => r.user_id) 
        : selectedRookies;

      if (usersToNotify.length > 0) {
        await supabase.functions.invoke('send-calendar-notification', {
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

  const toggleRookie = (userId: string) => {
    setSelectedRookies(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllRookies = () => {
    setSelectedRookies(rookies.map(r => r.user_id));
  };

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
            
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setIsTeamWide(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                  isTeamWide 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Users className="w-4 h-4" />
                Entire Team
              </button>
              <button
                type="button"
                onClick={() => setIsTeamWide(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                  !isTeamWide 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <User className="w-4 h-4" />
                Select Rookies
              </button>
            </div>

            {!isTeamWide && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : rookies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rookies in your downline
                  </p>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedRookies.length} of {rookies.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={selectAllRookies}
                        className="text-xs text-primary hover:underline"
                      >
                        Select all
                      </button>
                    </div>
                    <div className="space-y-1">
                      {rookies.map((rookie) => (
                        <label
                          key={rookie.user_id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedRookies.includes(rookie.user_id)}
                            onCheckedChange={() => toggleRookie(rookie.user_id)}
                          />
                          <span className="text-sm">{rookie.full_name}</span>
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
