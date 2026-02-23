import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Trophy, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StripData {
  dealsToday: number;
  dailyGoal: number;
  topProducer: string;
  topProducerDeals: number;
  teamStreak: number;
}

export function MomentumStrip() {
  const [data, setData] = useState<StripData>({
    dealsToday: 0,
    dailyGoal: 80,
    topProducer: '—',
    topProducerDeals: 0,
    teamStreak: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Get today's rep signups as "deals"
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: signups } = await supabase
        .from('rep_signups')
        .select('signed_by, rep_name')
        .gte('signed_at', today.toISOString());
      
      const dealsToday = signups?.length || 0;

      // Count by signer to find top producer
      const signerCounts: Record<string, number> = {};
      (signups || []).forEach(s => {
        if (s.signed_by) {
          signerCounts[s.signed_by] = (signerCounts[s.signed_by] || 0) + 1;
        }
      });

      let topProducer = '—';
      let topProducerDeals = 0;

      const topSignerId = Object.entries(signerCounts).sort((a, b) => b[1] - a[1])[0];
      if (topSignerId) {
        topProducerDeals = topSignerId[1];
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, nickname')
          .eq('user_id', topSignerId[0])
          .maybeSingle();
        topProducer = profile?.nickname || profile?.full_name?.split(' ')[0] || '—';
      }

      // Team streak: consecutive days with at least 1 signup
      let teamStreak = 0;
      const checkDate = new Date();
      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const { count } = await supabase
          .from('rep_signups')
          .select('id', { count: 'exact', head: true })
          .gte('signed_at', dayStart.toISOString())
          .lte('signed_at', dayEnd.toISOString());
        
        if ((count || 0) > 0) {
          teamStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setData({ dealsToday, dailyGoal: 80, topProducer, topProducerDeals, teamStreak });
    };
    fetchData();
  }, []);

  const progressPct = Math.min((data.dealsToday / data.dailyGoal) * 100, 100);

  return (
    <div className="w-full bg-gradient-to-r from-[hsl(220,16%,5%)] via-[hsl(220,14%,8%)] to-[hsl(220,16%,5%)] border-b border-border/30 px-4 py-2.5 flex-shrink-0">
      <div className="flex items-center justify-between gap-4 max-w-full">
        {/* Left - Daily Production */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Production</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-foreground tabular-nums">
              {data.dealsToday} <span className="text-muted-foreground font-medium">/ {data.dailyGoal}</span>
            </span>
            <div className="w-24 hidden sm:block">
              <Progress value={progressPct} className="h-1.5 bg-muted" />
            </div>
          </div>
        </div>

        {/* Center - Top Producer */}
        <div className="flex items-center gap-2 text-center hidden md:flex">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Top Today:</span>
          <span className="text-sm font-bold text-yellow-400">{data.topProducer}</span>
          {data.topProducerDeals > 0 && (
            <span className="text-xs text-muted-foreground">– {data.topProducerDeals} deals</span>
          )}
        </div>

        {/* Right - Team Streak */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">Streak:</span>
          <span className="text-sm font-bold text-primary tabular-nums">{data.teamStreak}d</span>
        </div>
      </div>
    </div>
  );
}
