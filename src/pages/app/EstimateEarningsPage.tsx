import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DollarSign, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useCompLadder, repRate, leaderRate } from '@/hooks/useCompLadder';
import { NOT_CONFIRMED, formatCurrency } from '@/lib/commission';

interface Scenarios {
  low: number;
  moderate: number;
  high: number;
  team: number | null;
}

export default function EstimateEarningsPage() {
  const { user } = useAuth();
  const { activeVertical } = useWorkspace();
  const { ladder, loading: ladderLoading } = useCompLadder(activeVertical);
  const [revenueInput, setRevenueInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [teamGoalTotal, setTeamGoalTotal] = useState<number | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(true);

  const myRate = repRate(ladder);
  const teamRate = leaderRate(ladder);
  const confirmed = myRate !== null || teamRate !== null;

  // Saved goal lives in the database, not the browser.
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('earnings_goals')
        .select('goal')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      const goal = data?.goal !== null && data?.goal !== undefined ? Number(data.goal) : null;
      if (goal && goal > 0) {
        setRevenueInput(goal.toLocaleString());
        setSubmitted(true);
      }
      setLoadingGoal(false);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Team goals only matter when the server returned leader rows.
  useEffect(() => {
    if (!user?.id || teamRate === null) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from('earnings_goals').select('user_id, goal');
      if (!active) return;
      const others = (data ?? []).filter((r) => r.user_id !== user.id);
      setTeamGoalTotal(others.reduce((s, r) => s + (Number(r.goal) || 0), 0));
    })();
    return () => {
      active = false;
    };
  }, [user?.id, teamRate]);

  const personalRevenue = parseInt(revenueInput.replace(/[^0-9]/g, '') || '0', 10);

  const scenarios: Scenarios | null = useMemo(() => {
    if (!submitted || personalRevenue <= 0 || !confirmed) return null;
    const rate = myRate ?? 0;
    return {
      low: Math.round(personalRevenue * 0.6 * rate),
      moderate: Math.round(personalRevenue * 0.8 * rate),
      high: Math.round(personalRevenue * 0.9 * rate),
      team: teamRate !== null && teamGoalTotal ? Math.round(teamGoalTotal * teamRate) : null,
    };
  }, [submitted, personalRevenue, confirmed, myRate, teamRate, teamGoalTotal]);

  const save = useCallback(
    async (goal: number, next: Scenarios | null) => {
      if (!user?.id) return;
      await supabase.from('earnings_goals').upsert(
        {
          user_id: user.id,
          goal,
          scenarios: (next ?? {}) as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    },
    [user?.id]
  );

  const handleSubmit = () => {
    if (personalRevenue <= 0) return;
    setSubmitted(true);
    const rate = myRate ?? 0;
    void save(
      personalRevenue,
      confirmed
        ? {
            low: Math.round(personalRevenue * 0.6 * rate),
            moderate: Math.round(personalRevenue * 0.8 * rate),
            high: Math.round(personalRevenue * 0.9 * rate),
            team: teamRate !== null && teamGoalTotal ? Math.round(teamGoalTotal * teamRate) : null,
          }
        : null
    );
  };

  const handleInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (clean === '') {
      setRevenueInput('');
      return;
    }
    setRevenueInput(parseInt(clean, 10).toLocaleString());
  };

  const loading = ladderLoading || loadingGoal;
  const tierLabel = ladder?.tier_label ?? 'Your tier';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageBackButton to="/app/links" label="Resources" />

        <PageHeader
          title="Estimate my earnings"
          context="Your projection uses the pay rows confirmed for your own tier."
          vertical={tierLabel}
          className="mb-8"
        />

        {!loading && !confirmed && (
          <p className="text-xs text-muted-foreground">{NOT_CONFIRMED}</p>
        )}

        {!loading && confirmed && (
          <>
            {teamRate !== null && (
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Team goals on file</p>
                  <p className="text-xs text-muted-foreground">
                    {teamGoalTotal ? formatCurrency(teamGoalTotal) : 'None saved yet'}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-bold text-foreground mb-2">
                Your personal revenue goal
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={revenueInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="250,000"
                    className="pl-9 text-lg font-semibold h-12"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={personalRevenue <= 0}
                  className="h-12 px-6 gap-2 font-bold"
                >
                  Calculate <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {submitted && scenarios && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Projected earnings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(
                    [
                      { key: 'low' as const, label: 'Conservative', note: '40% attrition' },
                      { key: 'moderate' as const, label: 'Moderate', note: '20% attrition' },
                      { key: 'high' as const, label: 'Optimistic', note: '10% attrition' },
                    ]
                  ).map((tier) => (
                    <div
                      key={tier.key}
                      className={cn(
                        'relative overflow-hidden rounded-xl p-5 border border-primary/30 transition-all',
                        tier.key === 'moderate' && 'ring-1 ring-primary/20'
                      )}
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06))',
                      }}
                    >
                      <div className="inline-block text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-3 bg-primary/10 text-primary">
                        {tier.label}
                      </div>
                      <p className="text-2xl md:text-3xl font-black tabular-nums text-primary">
                        {formatCurrency(scenarios[tier.key])}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tier.note}</p>
                      {tier.key === 'moderate' && (
                        <div className="absolute top-2 right-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            Most likely
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {scenarios.team !== null && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Team line: {formatCurrency(scenarios.team)} on the goals your people saved, at
                    the leader rows confirmed for your tier.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
