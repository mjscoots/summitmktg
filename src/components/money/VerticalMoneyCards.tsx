import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingList } from '@/components/shared/LoadingList';
import { cn } from '@/lib/utils';
import { ArrowUpRight, DollarSign, Layers } from 'lucide-react';
import { formatCurrency } from '@/lib/commission';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface Requirement {
  rule_type: string;
  value: number | null;
  window_weeks: number | null;
  description: string | null;
  progress: number | null;
}

interface LeaderInfo {
  name: string | null;
  rank: string | null;
  stack: number | null;
  spread: number | null;
}

interface VerticalCard {
  vertical: string;
  label: string;
  enrolled: boolean;
  enrollment_status: string | null;
  stack_value: number | null;
  stack_unit: string | null;
  stack_note: string | null;
  carrier: string | null;
  draft: boolean;
  leader: LeaderInfo | null;
  chain: { rank: string; stack: number | null }[] | null;
  summit_stack?: string | null;
  requirements: Requirement[];
}

interface MoneyView {
  rank: string | null;
  rank_is_summit: boolean;
  next_rank: string | null;
  visibility: string;
  producing_rep_definition: string | null;
  verticals: VerticalCard[];
}

const RULE_LABELS: Record<string, string> = {
  installs_total: 'installs',
  installs_per_week: 'weeks at target installs',
  weeks_active: 'weeks active',
  producing_reps: 'producing reps',
  team_leads_under: 'team leads under you',
  managers_under: 'managers under you',
};

function ruleText(r: Requirement) {
  if (r.description) return r.description;
  if (r.rule_type === 'installs_per_week') {
    return `${r.value ?? '—'} installs per week for ${r.window_weeks ?? 4} weeks`;
  }
  return `${r.value ?? '—'} ${RULE_LABELS[r.rule_type] ?? r.rule_type.replace(/_/g, ' ')}`;
}

function progressText(r: Requirement) {
  if (r.progress === null || r.value === null) return null;
  if (r.rule_type === 'installs_per_week') {
    return `${r.progress} of ${r.window_weeks ?? 4} weeks at ${r.value}+`;
  }
  return `${r.progress} of ${r.value} ${RULE_LABELS[r.rule_type] ?? ''}`.trim();
}

/**
 * My Money, per industry. One card per enrolled vertical plus a muted card for
 * every other vertical. All visibility rules are applied server-side by the
 * get_my_money function (admin settings, draft tables, rookie gating).
 */
export function VerticalMoneyCards({
  renderExtra,
}: {
  renderExtra?: (vertical: string) => ReactNode;
}) {
  const [data, setData] = useState<MoneyView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: res } = await (supabase as any).rpc('get_my_money');
      if (!active) return;
      setData((res as MoneyView) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingList rows={3} />;
  if (!data) return null;

  const rankLabel = data.rank ?? (data.rank_is_summit ? 'Summit' : 'Not set');

  return (
    <div className="space-y-4">
      <section className={cn(CARD, 'p-5 sm:p-6')}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/30 to-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Your rank</h2>
            <p className="text-xs text-muted-foreground">One rank, carried across every industry</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-bold text-primary">{rankLabel}</p>
            {data.next_rank && <p className="text-xs text-muted-foreground">Next: {data.next_rank}</p>}
          </div>
        </div>
        <Link
          to="/app/industries"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          How to move up <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {data.verticals.map((v) => (
        <div key={v.vertical} className="space-y-3">
          <section
            className={cn(
              CARD,
              'p-5 sm:p-6',
              !v.enrolled && 'opacity-60'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/30 to-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{v.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {v.enrolled
                    ? v.carrier
                      ? `${rankLabel} · ${v.carrier}`
                      : rankLabel
                    : 'Not active'}
                </p>
              </div>
              {!v.enrolled && (
                <Link
                  to="/app/industries"
                  className="ml-auto text-xs font-semibold text-primary hover:underline"
                >
                  Join
                </Link>
              )}
            </div>

            {v.enrolled && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your stack
                  </p>
                  {v.stack_value !== null ? (
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                      {formatCurrency(Number(v.stack_value))}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        {v.stack_unit ?? 'per install'}
                      </span>
                    </p>
                  ) : v.stack_note === 'Pay scale engine' ? (
                    <p className="mt-0.5 text-sm text-foreground">
                      Your commission tier from the pay scale, below.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.stack_note ?? 'Not set yet'}</p>
                  )}
                  {v.draft && v.stack_value !== null && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-400">Draft — not confirmed yet</p>
                  )}
                </div>

                {v.leader && (
                  <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      One level up
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">
                      Your manager's stack:{' '}
                      {v.leader.stack !== null ? formatCurrency(Number(v.leader.stack)) : 'Not set'}
                      {v.leader.spread !== null && (
                        <> · Spread per install: {formatCurrency(Number(v.leader.spread))}</>
                      )}
                    </p>
                    {v.leader.rank && (
                      <p className="mt-1 text-xs text-muted-foreground">{v.leader.rank}</p>
                    )}
                  </div>
                )}

                {v.chain && v.chain.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                    {v.chain.map((c, i) => (
                      <div
                        key={`${c.rank}-${i}`}
                        className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-sm first:border-t-0"
                      >
                        <span className="text-muted-foreground">{c.rank}</span>
                        <span className="tabular-nums font-semibold text-foreground">
                          {c.stack !== null ? formatCurrency(Number(c.stack)) : 'Not set'}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-sm">
                      <span className="text-muted-foreground">Summit</span>
                      <span className="tabular-nums font-semibold text-foreground">
                        {v.summit_stack ? formatCurrency(Number(v.summit_stack)) : 'Not set'}
                      </span>
                    </div>
                  </div>
                )}

                {data.next_rank && (
                  <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      To reach {data.next_rank}
                    </p>
                    {v.requirements.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">Not set</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1.5">
                        {v.requirements.map((r, i) => {
                          const p = progressText(r);
                          return (
                            <li key={i} className="text-sm text-foreground">
                              {ruleText(r)}
                              {p && <span className="ml-2 text-xs tabular-nums text-primary">{p}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {v.requirements.some((r) => r.rule_type === 'producing_reps') &&
                      data.producing_rep_definition && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {data.producing_rep_definition}
                        </p>
                      )}
                  </div>
                )}
              </div>
            )}
          </section>
          {v.enrolled && renderExtra?.(v.vertical)}
        </div>
      ))}
    </div>
  );
}

export default VerticalMoneyCards;
