import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFiberToday } from '@/hooks/useFiberToday';
import { TodayNumberSheet, PAY_NOTE } from '@/components/fiber/TodayNumberSheet';

/** Pass 92 — today and this week on the board, from the same day rows. */
export function FiberBoardToday() {
  const { today, week, reload } = useFiberToday();
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">{today}</p>
          <p className="text-[12px] tabular-nums text-muted-foreground">This week {week}</p>
        </div>
        <Button className="min-h-11" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          How many today?
        </Button>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">{PAY_NOTE}</p>
      <TodayNumberSheet open={open} onOpenChange={setOpen} onSaved={() => void reload()} />
    </section>
  );
}

export default FiberBoardToday;
