import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Calendar, Clock, Check, X, RefreshCw, Send, Loader2, Repeat } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  recipientId?: string;
  recipientName?: string;
  onComplete?: () => void;
}

// Quick time slot generator for next 5 business days
function generateTimeSlots() {
  const slots: Date[] = [];
  const now = new Date();
  for (let d = 1; d <= 5; d++) {
    const day = addDays(now, d);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
    for (const hour of [9, 10, 11, 13, 14, 15, 16]) {
      slots.push(setMinutes(setHours(day, hour), 0));
    }
  }
  return slots;
}

export function ScheduleOneOnOneDialog({ recipientId, recipientName, onComplete }: Props) {
  const { user } = useAuth();
  const { createRequest } = useSchedulingRequests();
  const [open, setOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [mode, setMode] = useState<'quick' | 'custom'>('custom');
  const [customDate1, setCustomDate1] = useState('');
  const [customTime1, setCustomTime1] = useState('');
  const [customDate2, setCustomDate2] = useState('');
  const [customTime2, setCustomTime2] = useState('');
  const [customDate3, setCustomDate3] = useState('');
  const [customTime3, setCustomTime3] = useState('');

  const timeSlots = generateTimeSlots();

  const toggleSlot = (iso: string) => {
    setSelectedSlots(prev => 
      prev.includes(iso) ? prev.filter(s => s !== iso) : prev.length < 3 ? [...prev, iso] : prev
    );
  };

  const getCustomSlots = (): string[] => {
    const slots: string[] = [];
    if (customDate1 && customTime1) slots.push(new Date(`${customDate1}T${customTime1}`).toISOString());
    if (customDate2 && customTime2) slots.push(new Date(`${customDate2}T${customTime2}`).toISOString());
    if (customDate3 && customTime3) slots.push(new Date(`${customDate3}T${customTime3}`).toISOString());
    return slots;
  };

  const allSlots = mode === 'custom' ? getCustomSlots() : selectedSlots;

  const handleSendWrapped = async () => {
    if (!recipientId || allSlots.length === 0) return;
    setSending(true);
    try {
      await createRequest(recipientId, allSlots, 'weekly_1on1', notes || undefined, recurring);
      toast({ title: 'Request Sent', description: `${recipientName} will see your proposed times.` });
      setOpen(false);
      setSelectedSlots([]);
      setCustomDate1(''); setCustomTime1('');
      setCustomDate2(''); setCustomTime2('');
      setCustomDate3(''); setCustomTime3('');
      setNotes('');
      onComplete?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <Calendar className="w-3.5 h-3.5" /> Schedule 1:1
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule 1:1 with {recipientName}
            </DialogTitle>
            <DialogDescription>
              Enter up to 3 times. They'll choose one.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
              <button
                onClick={() => setMode('custom')}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                  mode === 'custom' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom Times
              </button>
              <button
                onClick={() => setMode('quick')}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                  mode === 'quick' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Quick Pick
              </button>
            </div>

            {mode === 'custom' ? (
              <div className="space-y-3">
                {[
                  { date: customDate1, time: customTime1, setDate: setCustomDate1, setTime: setCustomTime1, label: 'Option 1' },
                  { date: customDate2, time: customTime2, setDate: setCustomDate2, setTime: setCustomTime2, label: 'Option 2' },
                  { date: customDate3, time: customTime3, setDate: setCustomDate3, setTime: setCustomTime3, label: 'Option 3' },
                ].map((slot, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{slot.label}{i === 0 ? ' *' : ' (optional)'}</p>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={e => slot.setDate(e.target.value)}
                        min={todayStr}
                        className="flex-1 bg-muted/30 border-border/50 text-sm"
                      />
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={e => slot.setTime(e.target.value)}
                        className="w-32 bg-muted/30 border-border/50 text-sm"
                      />
                    </div>
                  </div>
                ))}

                {/* Preview of custom selections */}
                {getCustomSlots().length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-1.5">Selected ({getCustomSlots().length}/3)</p>
                    <div className="space-y-1">
                      {getCustomSlots().map(s => (
                        <div key={s} className="flex items-center gap-2 text-xs text-foreground">
                          <Clock className="w-3 h-3 text-primary" />
                          {format(new Date(s), 'EEE, MMM d · h:mm a')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Quick pick time slots grouped by day */}
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {Array.from(new Set(timeSlots.map(s => format(s, 'yyyy-MM-dd')))).map(dayKey => {
                    const daySlots = timeSlots.filter(s => format(s, 'yyyy-MM-dd') === dayKey);
                    return (
                      <div key={dayKey}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                          {format(new Date(dayKey), 'EEEE, MMM d')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {daySlots.map(slot => {
                            const iso = slot.toISOString();
                            const selected = selectedSlots.includes(iso);
                            return (
                              <button
                                key={iso}
                                onClick={() => toggleSlot(iso)}
                                className={cn(
                                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                              >
                                <Clock className="w-3 h-3 inline mr-1" />
                                {format(slot, 'h:mm a')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedSlots.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-1.5">Selected ({selectedSlots.length}/3)</p>
                    <div className="space-y-1">
                      {selectedSlots.map(s => (
                        <div key={s} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{format(new Date(s), 'EEE, MMM d · h:mm a')}</span>
                          <button onClick={() => toggleSlot(s)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Recurring toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">
                  Repeat weekly
                </Label>
              </div>
              <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
            </div>
            {recurring && (
              <p className="text-[10px] text-muted-foreground -mt-2 px-1">
                After confirmation, a new request for the same time next week will be created automatically.
              </p>
            )}

            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note (optional)..."
              className="bg-muted/30 border-border/50 text-sm"
            />

            <Button
              onClick={handleSendWrapped}
              disabled={allSlots.length === 0 || sending}
              className="w-full gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Incoming request card for the recipient
export function SchedulingRequestCard({ request, onConfirm, onReschedule }: {
  request: any;
  onConfirm: (id: string, time: string) => void;
  onReschedule: (id: string) => void;
}) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar fullName={request.requester_name || 'Unknown'} avatarUrl={request.requester_avatar} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{request.requester_name}</p>
          <p className="text-[10px] text-muted-foreground">wants to schedule a 1:1</p>
        </div>
        <div className="flex items-center gap-1.5">
          {request.is_recurring && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Repeat className="w-2.5 h-2.5" /> Weekly
            </Badge>
          )}
          <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'confirmed' ? 'default' : 'outline'} className="text-[10px]">
            {request.status}
          </Badge>
        </div>
      </div>

      {request.status === 'pending' && (
        <>
          <p className="text-xs text-muted-foreground mb-2">Pick a time:</p>
          <div className="space-y-1.5 mb-3">
            {(request.proposed_times || []).map((t: string) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all",
                  selectedTime === t
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "border-border/50 text-foreground hover:border-border"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(t), 'EEEE, MMM d · h:mm a')}
                {selectedTime === t && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              disabled={!selectedTime}
              onClick={() => selectedTime && onConfirm(request.id, selectedTime)}
            >
              <Check className="w-3 h-3" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onReschedule(request.id)}
            >
              <RefreshCw className="w-3 h-3" /> Reschedule
            </Button>
          </div>
        </>
      )}

      {request.status === 'confirmed' && request.chosen_time && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {format(new Date(request.chosen_time), 'EEEE, MMM d · h:mm a')}
          </span>
        </div>
      )}

      {request.notes && (
        <p className="text-xs text-muted-foreground mt-2 italic">"{request.notes}"</p>
      )}
    </div>
  );
}
