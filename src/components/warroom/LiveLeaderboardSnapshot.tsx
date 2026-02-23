import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderEntry {
  name: string;
  deals: number;
}

export function LiveLeaderboardSnapshot() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaders = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: signups } = await supabase
        .from('rep_signups')
        .select('signed_by')
        .gte('signed_at', weekStart.toISOString());

      const counts: Record<string, number> = {};
      (signups || []).forEach(s => {
        if (s.signed_by) counts[s.signed_by] = (counts[s.signed_by] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      
      if (sorted.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, nickname')
          .in('user_id', sorted.map(s => s[0]));
        
        const profileMap: Record<string, string> = {};
        (profiles || []).forEach(p => {
          profileMap[p.user_id] = p.nickname || p.full_name?.split(' ')[0] || '?';
        });

        setLeaders(sorted.map(([uid, count]) => ({
          name: profileMap[uid] || '?',
          deals: count,
        })));
      }
    };
    fetchLeaders();
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-[hsl(220,14%,6%)] border border-border/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-yellow-500" />
          Leaderboard
        </h3>
        <button
          onClick={() => navigate('/app/leaderboard')}
          className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {leaders.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-3">No activity yet</p>
      ) : (
        <div className="space-y-0.5">
          {leaders.map((leader, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-1.5 px-2 rounded-md transition-colors ${
                i === 0 ? 'bg-yellow-500/5' : 'hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{medals[i] || `${i + 1}.`}</span>
                <span className={`text-xs font-medium ${i === 0 ? 'text-yellow-400' : 'text-foreground/80'}`}>
                  {leader.name}
                </span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${i === 0 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                {leader.deals}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
