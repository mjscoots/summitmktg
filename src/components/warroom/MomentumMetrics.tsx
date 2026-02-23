import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, DollarSign, Target, Phone } from 'lucide-react';

interface Metrics {
  dealsToday: number;
  dealsThisWeek: number;
  activeReps: number;
  totalReps: number;
  avgPerRep: number;
  weeklyTargetPct: number;
}

export function MomentumMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    dealsToday: 0,
    dealsThisWeek: 0,
    activeReps: 0,
    totalReps: 0,
    avgPerRep: 0,
    weeklyTargetPct: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const [todaySignups, weekSignups, activeProfiles, totalProfiles] = await Promise.all([
        supabase.from('rep_signups').select('id', { count: 'exact', head: true }).gte('signed_at', today.toISOString()),
        supabase.from('rep_signups').select('id', { count: 'exact', head: true }).gte('signed_at', weekStart.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active_now', true).neq('status', 'nlc'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('status', 'nlc'),
      ]);

      const dealsToday = todaySignups.count || 0;
      const dealsThisWeek = weekSignups.count || 0;
      const totalReps = totalProfiles.count || 1;
      const activeReps = activeProfiles.count || 0;

      setMetrics({
        dealsToday,
        dealsThisWeek,
        activeReps,
        totalReps,
        avgPerRep: totalReps > 0 ? Math.round((dealsThisWeek / totalReps) * 10) / 10 : 0,
        weeklyTargetPct: Math.min(Math.round((dealsThisWeek / Math.max(totalReps * 5, 1)) * 100), 100),
      });
    };
    fetchMetrics();
  }, []);

  const items = [
    { icon: TrendingUp, label: 'Deals Today', value: metrics.dealsToday, color: 'text-emerald-400' },
    { icon: DollarSign, label: 'This Week', value: metrics.dealsThisWeek, color: 'text-yellow-400' },
    { icon: Users, label: 'Active Now', value: `${metrics.activeReps}/${metrics.totalReps}`, color: 'text-primary' },
    { icon: Target, label: 'Avg/Rep', value: metrics.avgPerRep, color: 'text-orange-400' },
    { icon: Phone, label: 'Weekly Target', value: `${metrics.weeklyTargetPct}%`, color: 'text-primary' },
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
