import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Target, Phone } from 'lucide-react';

interface Metrics {
  activeReps: number;
  totalReps: number;
  weeklyTargetPct: number;
}

export function MomentumMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeReps: 0,
    totalReps: 0,
    weeklyTargetPct: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const [activeProfiles, totalProfiles] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_active_at', tenMinAgo).neq('status', 'nlc'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('status', 'nlc'),
      ]);

      const totalReps = totalProfiles.count || 1;
      const activeReps = activeProfiles.count || 0;

      setMetrics({
        activeReps,
        totalReps,
        weeklyTargetPct: Math.min(Math.round((activeReps / Math.max(totalReps, 1)) * 100), 100),
      });
    };
    fetchMetrics();
    // Refresh every 60s for real-time feel
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { icon: Users, label: 'Active Now', value: `${metrics.activeReps}/${metrics.totalReps}`, color: 'text-primary' },
    { icon: Target, label: 'Active %', value: `${metrics.weeklyTargetPct}%`, color: 'text-primary' },
  ];

  return (
    <div className="bg-[hsl(220,14%,6%)] border border-border/30 rounded-xl p-3 space-y-1">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3" />
        Team Pulse
      </h3>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
          <div className="flex items-center gap-2">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
