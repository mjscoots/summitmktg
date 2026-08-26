import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';

/**
 * A 64px progress ring for the week against the rep's own goal. Tapping it
 * opens a small stepper that writes the goal to the profile.
 */
export function GoalRing({ weekCount }: { weekCount: number }) {
  const { goal, save } = useWeeklyGoal();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);

  const value = draft ?? goal;
  const pct = goal > 0 ? Math.min(100, Math.round((weekCount / goal) * 100)) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(goal);
          setOpen(true);
        }}
        aria-label="Weekly goal"
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
      >
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
          />
        </svg>
        <span className="absolute text-[13px] font-bold tabular-nums text-foreground">
          {weekCount}/{goal}
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>Weekly goal</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Button
              variant="outline"
              className="h-12 w-12 p-0 text-lg"
              aria-label="Lower goal"
              onClick={() => setDraft(Math.max(1, value - 1))}
            >
              −
            </Button>
            <span className="w-16 text-center text-[32px] font-bold tabular-nums text-foreground">{value}</span>
            <Button
              variant="outline"
              className="h-12 w-12 p-0 text-lg"
              aria-label="Raise goal"
              onClick={() => setDraft(Math.min(200, value + 1))}
            >
              +
            </Button>
          </div>
          <Button
            className="mt-6 min-h-11 w-full"
            onClick={async () => {
              await save(value);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default GoalRing;
