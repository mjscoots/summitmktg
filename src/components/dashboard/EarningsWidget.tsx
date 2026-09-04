import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useCompLadder, repRate } from '@/hooks/useCompLadder';
import { formatCurrency } from '@/lib/commission';

/** The rep's saved goal, priced with the rate confirmed for their own tier. */
export function EarningsWidget() {
  const { user } = useAuth();
  const { activeVertical } = useWorkspace();
  const navigate = useNavigate();
  const { ladder } = useCompLadder(activeVertical);
  const [goal, setGoal] = useState<number | null>(null);

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
      const g = data?.goal !== null && data?.goal !== undefined ? Number(data.goal) : null;
      setGoal(g && g > 0 ? g : null);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const rate = repRate(ladder);
  if (!goal || rate === null) return null;

  const scenarios = [
    { label: 'Low', value: Math.round(goal * 0.6 * rate) },
    { label: 'Moderate', value: Math.round(goal * 0.8 * rate) },
    { label: 'High', value: Math.round(goal * 0.9 * rate) },
  ];

  return (
    <button
      onClick={() => navigate('/app/estimate-earnings')}
      className="w-full mb-5 glass-card rounded-2xl p-5 text-left glass-card-hover group overflow-hidden relative"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <DollarSign className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">Projected earnings</span>
          <Sparkles className="w-3 h-3 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {scenarios.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                {s.label}
              </p>
              <p className="text-base font-black tabular-nums text-primary">
                {formatCurrency(s.value)}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground italic">
          You're responsible for your own success.
        </p>
      </div>
    </button>
  );
}
