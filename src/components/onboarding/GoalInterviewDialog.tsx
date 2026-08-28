import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * The day one goal interview for the 2027 season: why they are here, what they
 * want to make, and the last day they are committing to.
 */
export function GoalInterviewDialog({
  open,
  onOpenChange,
  repId,
  repName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  repId?: string;
  repName?: string | null;
  onSaved?: () => void;
}) {
  const [why, setWhy] = useState('');
  const [goal, setGoal] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWhy('');
    setGoal('');
    setLastDay('');
  }, [open]);

  async function save() {
    if (!why.trim()) {
      toast.error('Write a sentence on why you are here');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('save_goal_interview', {
        _rep: repId ?? null,
        _why: why.trim(),
        _income_goal: goal ? Number(goal) : null,
        _last_day: lastDay || null,
      });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) {
        toast.error(res?.error || 'That did not save');
        return;
      }
      toast.success('Interview saved');
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error('That did not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Goal interview{repName ? ` — ${repName}` : ''}</DialogTitle>
          <DialogDescription>Three questions for the 2027 season.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[13px] text-muted-foreground" htmlFor="gi-why">
              Why are you here?
            </label>
            <Textarea
              id="gi-why"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="In your own words"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] text-muted-foreground" htmlFor="gi-goal">
              Income goal for the season
            </label>
            <Input
              id="gi-goal"
              className="h-11"
              type="number"
              inputMode="numeric"
              min={0}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Dollars"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] text-muted-foreground" htmlFor="gi-last">
              Last day you are committing to
            </label>
            <Input
              id="gi-last"
              className="h-11"
              type="date"
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
            />
          </div>
        </div>

        <Button className="min-h-11 w-full" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving' : 'Save interview'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default GoalInterviewDialog;
