import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useFirstWeek, type FirstWeekItem } from '@/hooks/useFirstWeek';
import { cn } from '@/lib/utils';
import { celebrate } from '@/lib/celebrate';

/**
 * A rookie's first seven days: today's items, progress across the week,
 * and one button that opens the first thing still open.
 */
export function FirstWeekCard() {
  const navigate = useNavigate();
  const { week, loading, mark } = useFirstWeek();
  const recorded = useRef(false);

  useEffect(() => {
    if (week.complete && !recorded.current) {
      recorded.current = true;
      void (supabase as any).rpc('finish_first_week');
      void celebrate('graduation');
    }
  }, [week.complete]);

  if (loading || !week.found || week.days.length === 0) return null;

  if (week.complete) {
    return (
      <section className="rounded-[10px] border border-border bg-card p-3">
        <p className="text-sm font-semibold text-foreground">First week done</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          All seven days are complete. Your manager has been told.
        </p>
      </section>
    );
  }

  const today = week.days.find((d) => d.day === week.day_number) || week.days[0];
  const openItem: { day: number; item: FirstWeekItem } | null = (() => {
    for (const d of week.days) {
      if (d.day > week.day_number) break;
      const it = d.items.find((i) => !i.done);
      if (it) return { day: d.day, item: it };
    }
    const it = today.items.find((i) => !i.done);
    return it ? { day: today.day, item: it } : null;
  })();

  const pct = week.total > 0 ? Math.round((week.done / week.total) * 100) : 0;

  return (
    <section className="space-y-3 rounded-[10px] border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">Your first week</h2>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Day {week.day_number} of 7
        </span>
      </div>

      <p className="text-[13px] text-muted-foreground">{today.title}</p>

      <ul className="space-y-2">
        {today.items.map((it) => {
          const selfCheck = it.rule === 'self';
          return (
            <li key={it.key} className="flex items-start gap-3">
              <button
                type="button"
                aria-label={it.done ? 'Mark not done' : 'Mark done'}
                disabled={!selfCheck}
                onClick={() => void mark(today.day, it.key, !it.done)}
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border',
                  it.done && 'border-primary bg-primary text-primary-foreground',
                  !selfCheck && 'opacity-70'
                )}
              >
                {it.done ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
              <span className={cn('text-[13px] text-foreground', it.done && 'text-muted-foreground')}>
                {it.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1">
        <div className="flex gap-1" aria-hidden>
          {week.days.map((d) => (
            <span
              key={d.day}
              className={cn('h-1.5 flex-1 rounded-sm bg-border', d.complete && 'bg-primary')}
            />
          ))}
        </div>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {week.done} of {week.total} items done ({pct}%)
        </p>
      </div>

      {openItem && (
        <Button
          className="min-h-11 w-full"
          onClick={() => navigate(openItem.item.link || '/app/playbook')}
        >
          Open {openItem.item.label.length > 34 ? 'today\u2019s next item' : openItem.item.label}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 w-full"
        onClick={() => navigate('/summer-checklist')}
      >
        See the full list
      </Button>
    </section>
  );
}

export default FirstWeekCard;
