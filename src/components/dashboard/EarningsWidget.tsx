import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function getRate(brackets: typeof ROOKIE_BRACKETS, revenue: number) {
  return (brackets.find(b => revenue >= b.min && revenue <= b.max) || brackets[0]).rate;
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function EarningsWidget() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`earnings_goal_${user.id}`);
    if (saved) setGoal(parseInt(saved));
  }, [user?.id]);

  const scenarios = useMemo(() => {
    if (!goal || goal <= 0) return null;
    const isVet = profile?.experience === 'veteran';
    const brackets = isVet ? VET_BRACKETS : ROOKIE_BRACKETS;
    const rate = getRate(brackets, goal);
    return {
      low: Math.round(goal * 0.6 * rate),
      moderate: Math.round(goal * 0.8 * rate),
      high: Math.round(goal * 0.9 * rate),
    };
  }, [goal, profile?.experience]);

  if (!goal || !scenarios) return null;

  return (
    <button
      onClick={() => navigate('/app/estimate-earnings')}
      className="w-full mb-5 glass-card rounded-2xl p-5 text-left glass-card-hover group overflow-hidden relative"
    >
      {/* Subtle glow */}
      <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.4) 0%, transparent 70%)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <DollarSign className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">Projected Earnings</span>
          <Sparkles className="w-3 h-3 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            { label: 'Low', value: scenarios.low, color: 'text-amber-400' },
            { label: 'Moderate', value: scenarios.moderate, color: 'text-primary' },
            { label: 'High', value: scenarios.high, color: 'text-emerald-400' },
          ]).map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{s.label}</p>
              <p className={cn('text-base font-black tabular-nums', s.color)}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground italic">
          You're responsible for your own success.
        </p>
      </div>
    </button>
  );
}
