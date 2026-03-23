import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Repeat, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrepRep } from '@/hooks/useOneOnOnePrep';

interface ScheduleTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rep: PrepRep;
  onConfirm: (time: string, repeats: boolean, recurringTime?: string) => void;
}

const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

type Step = 'pick-time' | 'ask-repeat' | 'pick-recurring';

export function ScheduleTimeDialog({ open, onOpenChange, rep, onConfirm }: ScheduleTimeDialogProps) {
  const [step, setStep] = useState<Step>('pick-time');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [recurringTime, setRecurringTime] = useState<string>('');
  const [customTime, setCustomTime] = useState('');

  const handleReset = () => {
    setStep('pick-time');
    setSelectedTime('');
    setRecurringTime('');
    setCustomTime('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) handleReset();
    onOpenChange(val);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep('ask-repeat');
  };

  const handleCustomTime = () => {
    if (customTime.trim()) {
      setSelectedTime(customTime.trim());
      setStep('ask-repeat');
    }
  };

  const handleRepeatYes = () => {
    onConfirm(selectedTime, true, selectedTime);
    handleReset();
  };

  const handleRepeatNo = () => {
    setStep('pick-recurring');
  };

  const handleSetRecurring = (time: string) => {
    onConfirm(selectedTime, true, time);
    handleReset();
  };

  const handleSkipRecurring = () => {
    onConfirm(selectedTime, false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {step === 'pick-time' && `Schedule 1:1 with ${rep.full_name}`}
            {step === 'ask-repeat' && 'Does this time repeat weekly?'}
            {step === 'pick-recurring' && 'Set recurring Monday 1:1 time'}
          </DialogTitle>
        </DialogHeader>

        {step === 'pick-time' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the time for this 1:1 session
            </p>
            <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  onClick={() => handleSelectTime(time)}
                  className={cn(
                    'text-xs py-2 px-1 rounded-lg border transition-colors',
                    'border-border/50 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                    'text-foreground font-medium'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Or type custom time..."
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomTime()}
              />
              <Button size="sm" variant="outline" onClick={handleCustomTime} disabled={!customTime.trim()}>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'ask-repeat' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You selected <span className="font-semibold text-foreground">{selectedTime}</span>.
              Does this time repeat every Monday?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleRepeatYes}
                className="flex-1"
                variant="default"
              >
                <Repeat className="w-4 h-4 mr-2" />
                Yes, repeats weekly
              </Button>
              <Button
                onClick={handleRepeatNo}
                className="flex-1"
                variant="outline"
              >
                No, just today
              </Button>
            </div>
          </div>
        )}

        {step === 'pick-recurring' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What is the recurring Monday 1:1 time for <span className="font-semibold text-foreground">{rep.full_name}</span>?
            </p>
            <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  onClick={() => handleSetRecurring(time)}
                  className={cn(
                    'text-xs py-2 px-1 rounded-lg border transition-colors',
                    'border-border/50 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                    'text-foreground font-medium'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleSkipRecurring}>
              Skip — no recurring time
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
