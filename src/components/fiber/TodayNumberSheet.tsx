import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';
import { supabase } from '@/integrations/supabase/client';
import { useFiberToday, todayStr, type Carrier } from '@/hooks/useFiberToday';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PAY_NOTE = 'Numbers feed the board. Pay comes from Gainz.';

/**
 * Pass 92 — the one-tap Today sheet. A big stepper for "how many today", one
 * optional line for what was sold, and two taps to submit. Same-day edits just
 * write over the day row.
 */
export function TodayNumberSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const { today, myDay, carriers, lastCarrierId, reload } = useFiberToday();
  const [count, setCount] = useState(0);
  const [carrierId, setCarrierId] = useState('');
  const [what, setWhat] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCount(today);
    setWhat(myDay?.note || '');
    setCarrierId(lastCarrierId || '');
  }, [open, today, myDay, lastCarrierId]);

  const save = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('log_fiber_today', {
      p_sold: count,
      p_carrier_id: carrierId || null,
      p_day: todayStr(),
      p_note: what.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    onOpenChange(false);
    await reload();
    onSaved?.();
    toast.success(count > 0 ? `${count} today` : 'Today saved');
    if (count > 0) celebrate('install');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How many today?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              className="h-14 w-14 rounded-full"
              aria-label="One fewer"
              onClick={() => setCount((c) => Math.max(0, c - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="min-w-[3ch] text-center text-5xl font-semibold tabular-nums text-foreground">
              {count}
            </span>
            <Button
              variant="outline"
              className="h-14 w-14 rounded-full"
              aria-label="One more"
              onClick={() => setCount((c) => Math.min(200, c + 1))}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="today-what">What did you sell?</Label>
            <Input
              id="today-what"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {carriers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Select value={carrierId} onValueChange={setCarrierId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Pick a carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c: Carrier) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">{PAY_NOTE}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="min-h-11" onClick={save} disabled={busy}>
            Save today
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TodayNumberSheet;
