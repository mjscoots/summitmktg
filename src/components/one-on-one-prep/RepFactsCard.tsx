import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

interface Facts {
  authorized: boolean;
  season_revenue: number | null;
  rev_per_day: number | null;
  training_minutes_week: number;
  last_trained: string | null;
  signed_2027: boolean | null;
  referrals: number;
  last_sale: string | null;
  last_fiber: string | null;
  revenue_goal: number | null;
}

interface Commitment {
  authorized: boolean;
  commitment: string | null;
  focus_area: string | null;
  at: string | null;
}

const FOCUS_LABEL: Record<string, string> = {
  skill: 'Mind (skill)',
  desire: 'Heart (desire)',
  activity: 'Feet (activity)',
};

function money(n: number | null): string | null {
  if (n === null || n === undefined) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  try {
    return differenceInCalendarDays(new Date(), parseISO(iso));
  } catch {
    return null;
  }
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={value ? 'text-[15px] font-semibold tabular-nums text-foreground' : 'text-[13px] text-muted-foreground'}>
        {value ?? 'Not on file'}
      </span>
    </div>
  );
}

/**
 * Read-only figures the manager should already know before the 1:1, plus what
 * the rep committed to last time. Manager and admin only, via secured lookups.
 */
export function RepFactsCard({ userId, mode }: { userId: string; mode: 'rookie' | 'manager' }) {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [last, setLast] = useState<Commitment | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [f, c] = await Promise.all([
        (supabase as any).rpc('get_rep_prep_facts', { _user_id: userId }),
        (supabase as any).rpc('get_prep_commitment', { _user_id: userId, _mode: mode }),
      ]);
      if (cancelled) return;
      setFacts((f.data as Facts) || null);
      setLast((c.data as Commitment) || null);
    };
    void load();
    return () => { cancelled = true; };
  }, [userId, mode]);

  if (!facts?.authorized) return null;

  const trainedDays = daysSince(facts.last_trained);
  const saleIso = [facts.last_sale, facts.last_fiber].filter(Boolean).sort().pop() || null;
  const saleDays = daysSince(saleIso);

  return (
    <section className="rounded-[10px] border border-border bg-card p-3">
      {last?.commitment ? (
        <div className="mb-3 rounded-[8px] border border-primary/30 bg-primary/10 p-2.5">
          <p className="text-[13px] text-foreground">
            Last time they committed to: <span className="font-semibold">{last.commitment}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {last.at ? format(parseISO(last.at), 'MMM d, yyyy') : 'Date not recorded'}
            {last.focus_area ? ` · ${FOCUS_LABEL[last.focus_area] ?? last.focus_area}` : ''}
          </p>
        </div>
      ) : null}

      <h3 className="mb-1 text-sm font-semibold text-foreground">Their numbers</h3>
      <div className="divide-y divide-border/40">
        <Row label="Season revenue" value={money(facts.season_revenue)} />
        <Row label="Rev per day" value={money(facts.rev_per_day)} />
        <Row label="Revenue goal" value={money(facts.revenue_goal)} />
        <Row label="Training this week" value={`${facts.training_minutes_week} min`} />
        <Row
          label="Last trained"
          value={
            facts.last_trained
              ? `${format(parseISO(facts.last_trained), 'MMM d')}${trainedDays !== null ? ` · ${trainedDays}d ago` : ''}`
              : null
          }
        />
        <Row
          label="Signed for 2027"
          value={facts.signed_2027 === null ? null : facts.signed_2027 ? 'Yes' : 'Not yet'}
        />
        <Row label="Referrals in" value={`${facts.referrals} of 3`} />
        <Row
          label="Last sale or fiber number"
          value={saleDays !== null ? `${saleDays}d ago` : null}
        />
      </div>
    </section>
  );
}
