import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { GoalInterviewDialog } from '@/components/onboarding/GoalInterviewDialog';

/** Asks a new rep for their goal interview until it is on file. */
export function GoalInterviewCard() {
  const { user } = useAuth();
  const [needed, setNeeded] = useState(false);
  const [open, setOpen] = useState(false);

  const check = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('commitment_interviews')
      .select('id')
      .eq('rep_id', user.id)
      .eq('season', '2027')
      .maybeSingle();
    setNeeded(!data);
  }, [user]);

  useEffect(() => {
    void check();
  }, [check]);

  if (!needed) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="micro-label mb-1">Goal interview</p>
      <p className="text-[14px] font-semibold text-foreground">Set your season goal</p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Three questions: why you are here, what you want to make, and your last day.
      </p>
      <Button className="mt-3 min-h-11 w-full" onClick={() => setOpen(true)}>
        Start the interview
      </Button>
      <GoalInterviewDialog open={open} onOpenChange={setOpen} onSaved={() => void check()} />
    </div>
  );
}

export default GoalInterviewCard;
