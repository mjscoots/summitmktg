import { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';

/** The drag range for the ring: one turn covers one to fifty accounts a week. */
const DRAG_MAX = 50;

/**
 * A 64px progress ring for the week against the rep's own goal. Tapping it
 * opens a small stepper that writes the goal to the profile.
 *
 * Pass 179: pressing and dragging around the ring sets the goal directly, the
 * figure moving with the finger, and the sheet stays open for the Save
 * confirmation. It saves through the same path the stepper already used
 * (profiles.weekly_goal); the earnings_goals editor on Estimate earnings is
 * untouched.
 */
export function GoalRing({ weekCount }: { weekCount: number }) {
  const { goal, save } = useWeeklyGoal();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const dragging = useRef(false);

  const value = draft ?? goal;
  const pct = goal > 0 ? Math.min(100, Math.round((weekCount / goal) * 100)) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;

  /** Angle from the top of the ring, clockwise, mapped to one to fifty. */
  const fromPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let angle = Math.atan2(dx, -dy);
    if (angle < 0) angle += Math.PI * 2;
    return Math.max(1, Math.min(DRAG_MAX, Math.round((angle / (Math.PI * 2)) * DRAG_MAX) || 1));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (dragging.current) return;
          setDraft(goal);
          setOpen(true);
        }}
        onPointerDown={(event) => {
          dragging.current = false;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0) return;
          dragging.current = true;
          setDraft(fromPointer(event));
          setOpen(true);
        }}
        onPointerUp={() => {
          window.setTimeout(() => {
            dragging.current = false;
          }, 0);
        }}
        aria-label="Weekly goal"
        className="relative flex h-16 w-16 shrink-0 touch-none items-center justify-center rounded-full"
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
            className="goal-ring-progress"
          />
        </svg>
        <span className="absolute text-[13px] font-bold tabular-nums text-foreground">
          {weekCount}/{value}
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
