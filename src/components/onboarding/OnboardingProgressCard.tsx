import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_ONBOARDING,
  ONBOARDING_STEPS,
  type OnboardingState,
} from '@/lib/onboardingSteps';

/**
 * The rep's own onboarding progress. Five steps, nothing about anyone else.
 * It disappears once every step is done.
 */
export function OnboardingProgressCard() {
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc('my_onboarding_state');
      const next = (data as OnboardingState | null) || null;
      setState(next && typeof next.total === 'number' ? next : EMPTY_ONBOARDING);
    })();
  }, []);

  if (!state || state.fully_onboarded) return null;

  const pct = Math.round((state.done / (state.total || 5)) * 100);

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-card/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold text-foreground">Getting you set up</p>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {state.done} of {state.total}
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-3 space-y-2">
        {ONBOARDING_STEPS.map((step) => {
          const done = Boolean(state[step.key]);
          return (
            <li key={step.key} className="flex items-center gap-2 text-[14px]">
              <span
                className={
                  done
                    ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary'
                    : 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15'
                }
              >
                {done && <Check className="h-3 w-3" />}
              </span>
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[13px] text-muted-foreground">
        Your manager ticks the agreement and payroll steps once they have them on file.
      </p>
    </section>
  );
}

export default OnboardingProgressCard;
