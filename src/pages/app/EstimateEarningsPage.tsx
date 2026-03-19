import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DollarSign, TrendingUp, Users, Sparkles, ArrowRight } from 'lucide-react';

// ============= COMMISSION TIERS =============
const ROOKIE_BRACKETS = [
  { min: 0, max: 69999, rate: 0.18 },
  { min: 70000, max: 99999, rate: 0.22 },
  { min: 100000, max: 149999, rate: 0.25 },
  { min: 150000, max: 199999, rate: 0.35 },
  { min: 200000, max: 249999, rate: 0.40 },
  { min: 250000, max: 299999, rate: 0.45 },
  { min: 300000, max: 399999, rate: 0.50 },
  { min: 400000, max: Infinity, rate: 0.55 },
];

const VET_BRACKETS = [
  { min: 0, max: 199999, rate: 0.40 },
  { min: 200000, max: 249999, rate: 0.50 },
  { min: 250000, max: 299999, rate: 0.55 },
  { min: 300000, max: 399999, rate: 0.60 },
  { min: 400000, max: 499999, rate: 0.65 },
  { min: 500000, max: Infinity, rate: 0.70 },
];

const MARKETING_DEAL_TIERS = [
  { min: 0, max: 249999, rate: 0.45 },
  { min: 250000, max: 499999, rate: 0.50 },
  { min: 500000, max: 1249999, rate: 0.55 },
  { min: 1250000, max: 2499999, rate: 0.60 },
  { min: 2500000, max: 3749999, rate: 0.65 },
  { min: 3750000, max: 4999999, rate: 0.675 },
  { min: 5000000, max: 7499999, rate: 0.70 },
  { min: 7500000, max: 9999999, rate: 0.72 },
  { min: 10000000, max: 12499999, rate: 0.74 },
  { min: 12500000, max: 14999999, rate: 0.76 },
  { min: 15000000, max: 19999999, rate: 0.78 },
  { min: 20000000, max: Infinity, rate: 0.80 },
];

function getRate(brackets: typeof ROOKIE_BRACKETS, revenue: number) {
  return (brackets.find(b => revenue >= b.min && revenue <= b.max) || brackets[0]).rate;
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

interface DownlineData {
  rookieCount: number;
  vetCount: number;
  managerCount: number;
  totalReps: number;
}

type CalcMode = 'rookie' | 'veteran' | 'manager';

export default function EstimateEarningsPage() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const [revenueInput, setRevenueInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [downline, setDownline] = useState<DownlineData>({ rookieCount: 0, vetCount: 0, managerCount: 0, totalReps: 0 });
  const [loading, setLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const experience = profile?.experience;
  const calcMode: CalcMode = isManager ? 'manager' : experience === 'veteran' ? 'veteran' : 'rookie';

  // Fetch downline data for managers
  useEffect(() => {
    if (!user?.id || !isManager) { setLoading(false); return; }
    const fetch = async () => {
      // Try edge-based downline first, fall back to text-based
      let dl: any[] = [];
      const { data: edgeData, error: edgeErr } = await supabase.rpc('get_downline_from_edges', { _manager_user_id: user.id });
      if (!edgeErr && edgeData && edgeData.length > 0) {
        dl = edgeData;
      } else {
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
        if (!myProfile) { setLoading(false); return; }
        const { data: textData } = await supabase.rpc('get_user_downline', { _manager_name: myProfile.full_name });
        dl = textData || [];
      }
      if (dl.length > 0) {
        const rookies = dl.filter((d: any) => d.role === 'rookie');
        setDownline({
          rookieCount: rookies.length,
          vetCount: 0,
          managerCount: dl.filter((d: any) => d.role === 'manager').length,
          totalReps: dl.length,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id, isManager]);

  // Load saved goal
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`earnings_goal_${user.id}`);
    if (saved) {
      setRevenueInput(parseInt(saved).toLocaleString());
      setSubmitted(true);
    }
    if (!isManager) setLoading(false);
  }, [user?.id]);

  const personalRevenue = parseInt(revenueInput.replace(/[^0-9]/g, '') || '0');

  const scenarios = useMemo(() => {
    if (!submitted || personalRevenue <= 0) return null;

    if (calcMode === 'rookie') {
      const rate = getRate(ROOKIE_BRACKETS, personalRevenue);
      return {
        low: { earnings: Math.round(personalRevenue * 0.6 * rate), label: '40% Attrition' },
        moderate: { earnings: Math.round(personalRevenue * 0.8 * rate), label: '20% Attrition' },
        high: { earnings: Math.round(personalRevenue * 0.9 * rate), label: '10% Attrition' },
      };
    }

    if (calcMode === 'veteran') {
      const rate = getRate(VET_BRACKETS, personalRevenue);
      return {
        low: { earnings: Math.round(personalRevenue * 0.6 * rate), label: '40% Attrition' },
        moderate: { earnings: Math.round(personalRevenue * 0.8 * rate), label: '20% Attrition' },
        high: { earnings: Math.round(personalRevenue * 0.9 * rate), label: '10% Attrition' },
      };
    }

    // Manager mode
    const rookieCount = downline.rookieCount;
    const personalRate = getRate(VET_BRACKETS, personalRevenue);

    // Rookie fallout logic: 25% fall off, fallen reps avg $20k revenue
    const productiveRookies = rookieCount * 0.75;
    const fallenRookies = rookieCount * 0.25;
    const fallenRookieRevenue = fallenRookies * 20000;

    // Average rookie revenue assumption based on personal goal as proxy
    const avgRookieRevenue = Math.min(personalRevenue * 0.4, 120000);

    const calcManagerScenario = (attritionRate: number) => {
      const personalNet = personalRevenue * (1 - attritionRate);
      const personalEarnings = personalNet * personalRate;

      const effectiveRookies = productiveRookies * (1 - attritionRate);
      const teamRevenue = effectiveRookies * avgRookieRevenue;
      const totalTeamRevenue = teamRevenue + fallenRookieRevenue;

      const mktgRate = getRate(MARKETING_DEAL_TIERS, totalTeamRevenue);

      // Manager earns margin on fallen rookies (rep doesn't get paid)
      const rookieAvgRate = getRate(ROOKIE_BRACKETS, avgRookieRevenue);
      const marginOnFallen = fallenRookieRevenue * (mktgRate - 0); // full margin since rep doesn't get paid

      const overrideOnActive = totalTeamRevenue * (mktgRate - rookieAvgRate);

      const totalEarnings = personalEarnings + overrideOnActive + marginOnFallen;
      return Math.round(Math.max(totalEarnings, personalEarnings));
    };

    return {
      low: { earnings: calcManagerScenario(0.4), label: '40% Attrition' },
      moderate: { earnings: calcManagerScenario(0.2), label: '20% Attrition' },
      high: { earnings: calcManagerScenario(0.1), label: '10% Attrition' },
    };
  }, [submitted, personalRevenue, calcMode, downline]);

  const handleSubmit = () => {
    if (personalRevenue > 0 && user?.id) {
      localStorage.setItem(`earnings_goal_${user.id}`, String(personalRevenue));
      localStorage.setItem(`earnings_scenarios_${user.id}`, JSON.stringify({
        low: personalRevenue,
        timestamp: Date.now(),
      }));
      setSubmitted(true);
    }
  };

  const handleInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (clean === '') { setRevenueInput(''); return; }
    setRevenueInput(parseInt(clean).toLocaleString());
  };

  const modeLabel = calcMode === 'rookie' ? 'Rookie' : calcMode === 'veteran' ? 'Veteran' : 'Manager';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageBackButton to="/app/links" label="Resources" />

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl mb-8 p-8 text-center"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(270 60% 20% / 0.3), hsl(var(--primary) / 0.1))' }}
        >
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.4) 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" /> {modeLabel} Estimator
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-2">
              Estimate My Earnings
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              See your projected income based on your role, team, and personal revenue goal.
            </p>
          </div>
        </div>

        {/* Team context for managers */}
        {isManager && !loading && downline.totalReps > 0 && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border/50">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Your Downline</p>
              <p className="text-xs text-muted-foreground">
                {downline.rookieCount} rookie{downline.rookieCount !== 1 ? 's' : ''} · {downline.managerCount} manager{downline.managerCount !== 1 ? 's' : ''} · {downline.totalReps} total
              </p>
            </div>
          </div>
        )}

        {/* Revenue input */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-foreground mb-2">
            Your Personal Revenue Goal
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={revenueInput}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="250,000"
                className="pl-9 text-lg font-semibold h-12"
              />
            </div>
            <Button onClick={handleSubmit} disabled={personalRevenue <= 0} className="h-12 px-6 gap-2 font-bold">
              Calculate <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {submitted && scenarios && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Projected Earnings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                { key: 'low' as const, label: 'Conservative', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30', text: 'text-amber-400', accent: 'bg-amber-500/10' },
                { key: 'moderate' as const, label: 'Moderate', color: 'from-primary/20 to-blue-500/10', border: 'border-primary/30', text: 'text-primary', accent: 'bg-primary/10' },
                { key: 'high' as const, label: 'Optimistic', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', accent: 'bg-emerald-500/10' },
              ]).map(tier => (
                <div
                  key={tier.key}
                  className={cn(
                    'relative overflow-hidden rounded-xl p-5 border transition-all',
                    tier.border,
                    tier.key === 'moderate' && 'ring-1 ring-primary/20'
                  )}
                  style={{ background: `linear-gradient(135deg, ${tier.color.split(' ').map(c => `hsl(var(--${c.replace('from-', '').replace('to-', '')}))`).join(', ')})` }}
                >
                  <div className={cn('inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-3', tier.accent, tier.text)}>
                    {tier.label}
                  </div>
                  <p className={cn('text-2xl md:text-3xl font-black tabular-nums', tier.text)}>
                    {fmt(scenarios[tier.key].earnings)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{scenarios[tier.key].label}</p>
                  {tier.key === 'moderate' && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">Most Likely</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isManager && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Includes rookie fallout margin (25% fall off, ~$20k avg revenue each — you keep the margin)
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
