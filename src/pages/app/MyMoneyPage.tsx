import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Home, TrendingUp, Info } from 'lucide-react';
import { LoadingList } from '@/components/shared/LoadingList';
import {
  PayScale,
  PAY_SCALE_LABELS,
  formatCurrency,
  formatRate,
  formatTierRange,
  getNextTier,
  getTier,
  getTiers,
} from '@/lib/commission';
import { cn } from '@/lib/utils';
import { isManagerOrAbove } from '@/lib/roles';
import { MyFiberWeeks } from '@/components/money/MyFiberWeeks';
import { MyRevenueMonths } from '@/components/money/MyRevenueMonths';
import { MySpreadSection } from '@/components/money/MySpreadSection';
import { SentRepOverrideNote } from '@/components/money/SentRepOverrideNote';
import { VerticalMoneyCards } from '@/components/money/VerticalMoneyCards';
import { PayLadderTrack } from '@/components/shared/PayLadderTrack';
import { PageHeader } from '@/components/layout/PageHeader';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FiberStackView } from '@/components/money/FiberStackView';
import { DashboardFunnelTracker } from '@/components/dashboard/DashboardFunnelTracker';
import { LogSaleButton } from '@/components/sales/LogSaleButton';

const CARD = 'rounded border border-border bg-card';

interface CommissionRow {
  pay_scale: string;
  signs: number;
  avg_account_value: number | null;
  active_revenue: number | null;
  rate_override: number | null;
  notes: string | null;
}

interface HousingRow {
  monthly_cost: number | null;
  location: string | null;
  notes: string | null;
}

export default function MyMoneyPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState<CommissionRow | null>(null);
  const [housing, setHousing] = useState<HousingRow | null>(null);
  const [teamMonths, setTeamMonths] = useState<{ full_name: string | null; month: string; revenue: number | null }[]>(
    []
  );
  const isManagerRole = isManagerOrAbove(role);
  const { activeVertical } = useWorkspace();
  const isFiber = activeVertical === 'Fiber';
  const isLife = activeVertical === 'Life';
  const isStaff = role === 'admin' || role === 'owner';


  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    (async () => {
      const [c, h] = await Promise.all([
        supabase
          .from('rep_commission')
          .select('pay_scale, signs, avg_account_value, active_revenue, rate_override, notes')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('rep_housing')
          .select('monthly_cost, location, notes')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (!active) return;
      setCommission((c.data as CommissionRow) ?? null);
      setHousing((h.data as HousingRow) ?? null);
      setLoading(false);

      if (isManagerRole) {
        const { data: team } = await (supabase as any).rpc('get_team_revenue');
        if (!active) return;
        setTeamMonths((team?.rows as any[]) ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading, isManagerRole]);

  const money = useMemo(() => {
    if (!commission) return null;
    const scale = (['rookie', 'veteran', 'marketing'].includes(commission.pay_scale)
      ? commission.pay_scale
      : 'rookie') as PayScale;
    const signs = commission.signs ?? 0;
    const avg = commission.avg_account_value ?? null;
    const revenue =
      commission.active_revenue ?? (avg !== null ? signs * avg : null);
    const tier = revenue !== null ? getTier(scale, revenue) : null;
    const rate = commission.rate_override ?? tier?.rate ?? null;
    const earnings = revenue !== null && rate !== null ? revenue * rate : null;
    const next = revenue !== null ? getNextTier(scale, revenue) : null;
    const revenueToNext = next && revenue !== null ? Math.max(next.min - revenue, 0) : null;
    const signsToNext =
      revenueToNext !== null && avg && avg > 0 ? Math.ceil(revenueToNext / avg) : null;
    return { scale, signs, avg, revenue, tier, rate, earnings, next, revenueToNext, signsToNext };
  }, [commission]);

  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'Pest', label: 'Pest' },
    { key: 'Fiber', label: 'Fiber' },
    { key: 'Life', label: 'Life' },
  ] as const;

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <PageHeader
          title="My money"
          context="Every industry in one place. Set by your leader."
        />

        <div
          role="tablist"
          aria-label="Industry"
          className="flex items-stretch gap-1 rounded border border-border bg-surface-elevated p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'min-h-11 flex-1 rounded text-[13px] font-semibold transition-colors',
                tab === t.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'all' && <AllMoneyCard />}

        {tab === 'Fiber' && (
          <>
            <FiberStackView />
            <MyFiberWeeks />
          </>
        )}

        {tab === 'Life' && (
          <section className={cn(CARD, 'space-y-3 p-5 sm:p-6')}>
            <p className="text-sm text-muted-foreground">
              Life pay details will appear here once they are set.
            </p>
            {isStaff && (
              <Button variant="outline" size="sm" className="min-h-11" asChild>
                <Link to="/admin/money">Admin — Money</Link>
              </Button>
            )}
          </section>
        )}

        {tab === 'Pest' && (
          <>


        {!loading && money && money.earnings !== null && (
          <section className="card-hero px-5 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Season earnings so far
            </p>
            <p className="mt-1 font-display text-[56px] font-extrabold leading-none tabular-nums text-foreground">
              {formatCurrency(money.earnings)}
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {money.rate !== null ? `${formatRate(money.rate)} on ${formatCurrency(money.revenue ?? 0)} active revenue.` : 'Rate not set yet.'}
            </p>
          </section>
        )}

        {activeVertical === 'Pest' && <LogSaleButton />}


        <VerticalMoneyCards
          renderExtra={(vertical) =>
            vertical === 'Fiber' ? (
              <MyFiberWeeks />
            ) : vertical === 'Pest' ? (
              <MyRevenueMonths />
            ) : null
          }
        />

        {isManagerRole && (
          <>
            <SentRepOverrideNote />
            <MySpreadSection />
            {activeVertical === 'Pest' && <DashboardFunnelTracker />}
          </>
        )}

        {loading ? (

          <LoadingList rows={3} />
        ) : (
          <>
            {/* ===== COMMISSION ===== */}
            <section className={cn(CARD, 'p-5 sm:p-6')}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-primary/20 bg-primary/10">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Commission</h2>
                  <p className="text-xs text-muted-foreground">Your rate and season earnings</p>
                </div>
              </div>

              {!money || money.revenue === null ? (
                <p className="text-sm text-muted-foreground">
                  Your commission numbers haven't been set yet — ask your manager.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="Pay scale" value={PAY_SCALE_LABELS[money.scale]} />
                    <Stat label="Signs this season" value={String(money.signs)} />
                    <Stat
                      label="Your rate"
                      value={money.rate !== null ? formatRate(money.rate) : '—'}
                      accent
                    />
                    <Stat
                      label="Season earnings"
                      value={money.earnings !== null ? formatCurrency(money.earnings) : '—'}
                      accent
                    />
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                      The math
                    </p>
                    <p className="text-sm text-foreground">
                      {formatCurrency(money.revenue)} active revenue ×{' '}
                      {money.rate !== null ? formatRate(money.rate) : '—'} rate ={' '}
                      <span className="font-semibold">
                        {money.earnings !== null ? formatCurrency(money.earnings) : '—'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {money.avg && !commission?.active_revenue
                        ? `Active revenue = ${money.signs} signs × ${formatCurrency(money.avg)} average account value.`
                        : 'Active revenue is set from your serviced accounts.'}
                      {commission?.rate_override !== null && commission?.rate_override !== undefined
                        ? ' Your rate was set manually by an admin.'
                        : money.tier
                        ? ` Your rate comes from the ${PAY_SCALE_LABELS[money.scale]} pay scale bracket ${formatTierRange(money.tier)}.`
                        : ''}
                    </p>
                  </div>

                  {/* Pay ladder track */}
                  <div>
                    <p className="micro-label mb-3">
                      {PAY_SCALE_LABELS[money.scale]} pay ladder
                    </p>
                    <PayLadderTrack
                      tiers={getTiers(money.scale).map((t) => ({
                        label: formatTierRange(t),
                        rateLabel: formatRate(t.rate),
                        min: t.min,
                        max: t.max === Infinity ? null : t.max,
                      }))}
                      value={money.revenue ?? 0}
                      formatAmount={formatCurrency}
                    />
                  </div>

                </div>
              )}
            </section>




            {/* ===== TEAM REVENUE (managers+) ===== */}
            {isManagerRole && (
              <section className={cn(CARD, 'p-5 sm:p-6')}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-primary/20 bg-primary/10">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">My team's revenue</h2>
                    <p className="text-xs text-muted-foreground">Only months that have been entered</p>
                  </div>
                </div>

                {teamMonths.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No months entered yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2 font-medium">Rep</th>
                          <th className="px-4 py-2 font-medium">Month</th>
                          <th className="px-4 py-2 font-medium text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMonths.map((r, i) => (
                          <tr key={i} className="border-t border-white/[0.05]">
                            <td className="px-4 py-2 text-foreground">{r.full_name || '—'}</td>
                            <td className="px-4 py-2 tabular-nums text-muted-foreground">
                              {new Date(r.month + 'T00:00:00').toLocaleDateString(undefined, {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">
                              {formatCurrency(Number(r.revenue) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}


            {/* ===== HOUSING ===== */}
            <section className={cn(CARD, 'p-5 sm:p-6')}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-primary/20 bg-primary/10">
                  <Home className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Housing</h2>
                  <p className="text-xs text-muted-foreground">Set by your manager</p>
                </div>
              </div>

              {!housing ? (
                <p className="text-sm text-muted-foreground">
                  Your housing hasn't been set yet — ask your manager.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Monthly cost"
                      value={
                        housing.monthly_cost !== null && housing.monthly_cost !== undefined
                          ? formatCurrency(Number(housing.monthly_cost))
                          : 'Not set'
                      }
                      accent={housing.monthly_cost !== null}
                    />
                    <Stat label="Location" value={housing.location || 'Not set'} />
                  </div>
                  {housing.notes && (
                    <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                        Notes
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{housing.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ===== PATH TO NEXT TIER ===== */}
            <section className={cn(CARD, 'p-5 sm:p-6')}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-primary/20 bg-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Path to next tier</h2>
                  <p className="text-xs text-muted-foreground">What it takes to move up</p>
                </div>
              </div>

              {!money || money.revenue === null ? (
                <p className="text-sm text-muted-foreground">
                  This shows up once your commission numbers are set.
                </p>
              ) : !money.next ? (
                <p className="text-sm text-foreground">
                  You're on the top bracket of the {PAY_SCALE_LABELS[money.scale]} pay scale at{' '}
                  {money.tier ? formatRate(money.tier.rate) : '—'}. There's no higher tier.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    You need {formatCurrency(money.revenueToNext ?? 0)} more active revenue
                    {money.signsToNext !== null
                      ? ` — about ${money.signsToNext} more ${money.signsToNext === 1 ? 'sign' : 'signs'} at your ${formatCurrency(money.avg!)} average account value.`
                      : '.'}
                  </p>
                  {money.signsToNext === null && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Sign count can't be calculated until your average account value is set.
                    </p>
                  )}
                  {commission?.rate_override !== null && commission?.rate_override !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Your rate is currently set manually, so hitting the next bracket may not change your pay.
                      Check with your manager.
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-ice px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-base font-bold mt-0.5 truncate',
          accent ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  );
}
