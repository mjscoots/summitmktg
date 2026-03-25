import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatInTimezone, getTimezoneShort } from '@/lib/timezones';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { 
  Calendar, Clock, MapPin, Users, User, FileText, RefreshCcw,
  ExternalLink, Pencil, Trash2, Video, Building2,
  TrendingUp, Trophy, Star, Shield, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/lib/sanitizeUrl';

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

interface Attendee {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface EventDetailsModalProps {
  event: CalendarEvent;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  canEdit?: boolean;
}

const EVENT_CATEGORY_MAP: Record<string, string> = {
  call: 'mandatory',
  deadline: 'mandatory',
  training: 'training',
  meeting: 'revenue',
  general: 'optional',
};

export function EventDetailsModal({ 
  event, isOpen, onClose, onEdit, onDelete, canEdit = false 
}: EventDetailsModalProps) {
  const { profile } = useAuth();
  const { timezone } = useUserTimezone();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [creator, setCreator] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const category = EVENT_CATEGORY_MAP[event.event_type || 'general'] || 'optional';
  const isMandatory = category === 'mandatory' || category === 'training';

  useEffect(() => {
    if (!isOpen) return;
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const { data: assignees } = await supabase
          .from('calendar_event_assignees')
          .select('user_id')
          .eq('event_id', event.id);

        if (assignees && assignees.length > 0) {
          const userIds = assignees.map(a => a.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds);
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);
          const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
          setAttendees((profiles || []).map(p => ({
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            role: roleMap.get(p.user_id) || 'rookie'
          })));
        } else if (event.is_team_wide) {
          setAttendees([]);
        }

        if (event.created_by) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', event.created_by)
            .single();
          if (creatorProfile) setCreator(creatorProfile);
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [event.id, event.created_by, event.is_team_wide, isOpen]);

  const eventDate = new Date(event.event_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;

  const isUrl = (str: string) => {
    try {
      const parsed = new URL(str);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch { return false; }
  };

  const getRecurrenceText = () => {
    if (!event.recurrence_type) return null;
    const interval = event.recurrence_interval || 1;
    switch (event.recurrence_type) {
      case 'daily': return interval === 1 ? 'Repeats daily' : `Every ${interval} days`;
      case 'weekly': return interval === 1 ? 'Repeats weekly' : `Every ${interval} weeks`;
      case 'biweekly': return 'Every 2 weeks';
      case 'monthly': return interval === 1 ? 'Repeats monthly' : `Every ${interval} months`;
      default: return 'Recurring';
    }
  };

  const getCategoryBadge = () => {
    const styles: Record<string, { label: string; class: string }> = {
      mandatory: { label: 'MANDATORY', class: 'bg-red-500/15 text-primary ring-1 ring-red-500/20' },
      training: { label: 'TRAINING', class: 'bg-blue-500/15 text-blue-400' },
      revenue: { label: 'REVENUE / 1-ON-1', class: 'bg-purple-500/15 text-primary' },
      optional: { label: 'OPTIONAL', class: 'bg-primary/15 text-primary' },
    };
    const s = styles[category] || styles.optional;
    return (
      <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider', s.class)}>
        {s.label}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {getCategoryBadge()}
                {event.location && (() => {
                  const loc = event.location!.toLowerCase();
                  const remote = loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('http') || loc.includes('virtual') || loc.includes('remote') || loc.includes('online');
                  return (
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1",
                      remote
                        ? "bg-[hsl(270,60%,50%)]/15 text-[hsl(270,60%,65%)]"
                        : "bg-[hsl(25,90%,55%)]/15 text-[hsl(25,90%,60%)]"
                    )}>
                      {remote ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {remote ? 'Remote' : 'In Person'}
                    </span>
                  );
                })()}
                {event.is_team_wide && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> Team-Wide
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatInTimezone(eventDate, timezone, 'EEEE, MMM d')}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatInTimezone(eventDate, timezone, 'h:mm a')} {getTimezoneShort(timezone)}
                {endDate && ` – ${formatInTimezone(endDate, timezone, 'h:mm a')} ${getTimezoneShort(timezone)}`}
              </p>
              {getRecurrenceText() && (
                <p className="text-xs text-primary flex items-center gap-1.5 mt-1">
                  <RefreshCcw className="w-3 h-3" /> {getRecurrenceText()}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Location</p>
                {isUrl(event.location) ? (
                  <a href={sanitizeUrl(event.location)} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5">
                    {event.location.includes('zoom') ? 'Join Zoom Meeting' : 'Open Link'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* ═══ Behavioral Reinforcement Section ═══ */}
          {isMandatory && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Attending this event increases:
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Trophy, label: 'Leaderboard Eligibility', color: 'text-primary' },
                  { icon: Star, label: 'Bonus Eligibility', color: 'text-primary' },
                  { icon: Shield, label: 'Top 5 Room Selection', color: 'text-primary' },
                  { icon: TrendingUp, label: 'Execution Score', color: 'text-primary' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <item.icon className={cn("w-3.5 h-3.5 shrink-0", item.color)} />
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendees */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">
                {event.is_team_wide ? 'Team-Wide Event' : `Attendees (${attendees.length})`}
              </p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : event.is_team_wide ? (
                <p className="text-sm text-muted-foreground">All team members are invited</p>
              ) : attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific attendees assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {attendees.slice(0, 8).map(attendee => (
                    <div key={attendee.user_id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                      <UserAvatar avatarUrl={attendee.avatar_url} fullName={attendee.full_name} size="sm" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{attendee.full_name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{attendee.role}</p>
                      </div>
                    </div>
                  ))}
                  {attendees.length > 8 && (
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">+{attendees.length - 8} more</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Created By */}
          {creator && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Created by</p>
                <p className="text-sm text-muted-foreground">{creator.full_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border">
          <AddToCalendarButton
            title={event.title}
            startDate={eventDate}
            endDate={endDate || undefined}
            location={event.location || undefined}
            description={event.description || undefined}
            organizer={profile?.full_name}
            size="default"
          />
          
          {canEdit && onEdit && (
            <Button variant="outline" size="sm"
              onClick={() => { onClose(); onEdit(event); }}
              className="gap-1.5">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          
          {canEdit && onDelete && (
            <Button variant="outline" size="sm"
              onClick={() => { onClose(); onDelete(event.id); }}
              className="gap-1.5 text-primary hover:text-primary hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          )}
          
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
