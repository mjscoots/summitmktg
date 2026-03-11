import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Calendar, Clock, Sparkles, Loader2, Upload, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  event_type: string | null;
}

export function DashboardCalendar() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date();
      const weekEnd = addDays(now, 7);
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, end_date, location, description, event_type')
        .gte('event_date', now.toISOString())
        .lte('event_date', weekEnd.toISOString())
        .order('event_date', { ascending: true })
        .limit(20);
      setEvents((data as CalendarEvent[]) || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleAIParse = async () => {
    if (!uploadText.trim() || !user) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-calendar', {
        body: { text: uploadText },
      });
      if (error) throw error;
      const parsed: any[] = data?.events || [];
      if (parsed.length === 0) {
        toast.error('No events could be parsed from the text.');
        return;
      }
      const tz = profile?.timezone || 'America/Los_Angeles';
      const inserts = parsed.map(e => ({
        title: e.title,
        event_date: `${e.date}T${e.start_time}:00`,
        end_date: e.end_time ? `${e.date}T${e.end_time}:00` : null,
        description: e.description || null,
        location: e.location || null,
        created_by: user.id,
        manager_id: user.id,
        timezone: tz,
      }));
      const { error: insertErr } = await supabase.from('calendar_events').insert(inserts);
      if (insertErr) throw insertErr;
      toast.success(`${parsed.length} events added to calendar!`);
      setUploadText('');
      setShowUpload(false);
      // Re-fetch
      const now = new Date();
      const weekEnd = addDays(now, 7);
      const { data: refreshed } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, end_date, location, description, event_type')
        .gte('event_date', now.toISOString())
        .lte('event_date', weekEnd.toISOString())
        .order('event_date', { ascending: true })
        .limit(20);
      setEvents((refreshed as CalendarEvent[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse events');
    } finally {
      setParsing(false);
    }
  };

  // Group events by day label
  const groupedEvents = events.reduce<{ label: string; events: CalendarEvent[] }[]>((acc, event) => {
    const eventDate = parseISO(event.event_date);
    let label: string;
    if (isToday(eventDate)) label = 'Today';
    else if (isTomorrow(eventDate)) label = 'Tomorrow';
    else label = format(eventDate, 'EEEE, MMM d');
    
    const existing = acc.find(g => g.label === label);
    if (existing) existing.events.push(event);
    else acc.push({ label, events: [event] });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Calendar</h2>
          {events.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {events.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">AI Add</span>
        </button>
      </div>

      {groupedEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No upcoming events this week</p>
      ) : (
        <div className="space-y-3">
          {groupedEvents.map(group => (
            <div key={group.label}>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-1.5",
                group.label === 'Today' ? "text-primary" : "text-muted-foreground"
              )}>
                {group.label}
              </p>
              <div className="space-y-1">
                {group.events.map(event => {
                  const time = format(parseISO(event.event_date), 'h:mm a');
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/30 transition-colors group"
                    >
                      <div className="w-1 h-6 rounded-full bg-primary/40 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5" />
                            {time}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                              <MapPin className="w-2.5 h-2.5" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Add Events with AI
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste your schedule, call list, or meeting times below. AI will parse them into calendar events.
          </p>
          <Textarea
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            placeholder={"Monday 9am - Team standup\nTuesday 2pm - Client call with John\nWednesday 10:30am - Training session"}
            rows={6}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleAIParse} disabled={!uploadText.trim() || parsing}>
              {parsing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Parsing...</> : <><Upload className="w-4 h-4 mr-1" /> Parse & Add</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
