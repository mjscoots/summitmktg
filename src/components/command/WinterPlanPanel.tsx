import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, RotateCcw } from 'lucide-react';

interface Person {
  user_id: string;
  full_name: string | null;
}
interface Group {
  answer: string;
  count: number;
  people: Person[];
}
interface Summary {
  season_year: number;
  answered: number;
  by_answer: Group[];
}

interface FiberRow {
  user_id: string;
  full_name: string | null;
  answered_at: string;
  application_status: string;
}

/** Owner and admin view: winter plan counts with the names behind each answer. */
export function WinterPlanPanel({ fiberOnly = false }: { fiberOnly?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fiber, setFiber] = useState<FiberRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fiberOnly) {
      const { data } = await supabase.rpc('get_winter_plan_summary' as never);
      setSummary((data as unknown as Summary) ?? null);
    }
    const { data: rows } = await supabase.rpc('get_fiber_winter_interest' as never);
    setFiber((rows as unknown as FiberRow[]) || []);
  }, [fiberOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const reopen = async (userId: string) => {
    const { data, error } = await supabase.rpc('reopen_winter_plan' as never, {
      _user_id: userId,
    } as never);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not re-open',
        description: res?.error || error?.message || 'Try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Prompt re-opened' });
    load();
  };

  const nothing = !fiberOnly && (!summary || summary.answered === 0);

  return (
    <div className="glass-card rounded-[var(--radius)] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">
          {fiberOnly ? 'Winter plan - chose Fiber' : 'Winter plan'}
        </h2>
        {!fiberOnly && summary && (
          <span className="stat-num text-[13px] text-muted-foreground">
            {summary.answered} answered
          </span>
        )}
      </div>

      {nothing && (
        <p className="mt-2 text-[13px] text-muted-foreground">No answers yet.</p>
      )}

      {!fiberOnly && summary && summary.answered > 0 && (
        <div className="mt-3 space-y-1.5">
          {summary.by_answer.map((g) => (
            <div key={g.answer} className="rounded-[var(--radius)] border border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                onClick={() => setOpen(open === g.answer ? null : g.answer)}
                aria-expanded={open === g.answer}
              >
                <span className="text-[14px] text-foreground">{g.answer}</span>
                <span className="flex items-center gap-2">
                  <span className="stat-num text-[14px] text-foreground">{g.count}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      open === g.answer ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </button>
              {open === g.answer && (
                <ul className="border-t border-border px-3 py-2">
                  {g.people.map((p) => (
                    <li
                      key={p.user_id}
                      className="flex items-center justify-between py-1 text-[13px] text-muted-foreground"
                    >
                      <span>{p.full_name || 'Unnamed'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[12px]"
                        onClick={() => reopen(p.user_id)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Re-open
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={fiberOnly ? '' : 'mt-4 border-t border-border pt-3'}>
        {!fiberOnly && (
          <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">
            Fiber application status
          </p>
        )}
        {fiber.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nobody has chosen Fiber yet.</p>
        ) : (
          <ul className="space-y-1">
            {fiber.map((r) => (
              <li
                key={r.user_id}
                className="flex items-center justify-between text-[13px] text-foreground"
              >
                <span>{r.full_name || 'Unnamed'}</span>
                <span className="text-muted-foreground">{r.application_status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
