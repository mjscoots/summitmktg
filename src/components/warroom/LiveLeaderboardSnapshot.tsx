import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderEntry {
  name: string;
  points: number;
  rank: number;
}

export function LiveLeaderboardSnapshot() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase.rpc('get_current_leaderboard');

      if (error) {
        console.error('Leaderboard snapshot RPC error:', error);
        return;
      }

      const top5: LeaderEntry[] = (data || [])
        .filter((row: any) => (row.total_points || 0) > 0)
        .slice(0, 5)
        .map((row: any) => ({
          name: row.nickname || row.full_name?.split(' ')[0] || '?',
          points: row.total_points || 0,
          rank: Number(row.rank) || 0,
        }));

      setLeaders(top5);
    };
    fetchLeaders();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaders, 30000);
    return () => clearInterval(interval);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-[hsl(220,14%,6%)] border border-border/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-primary" />
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
                i === 0 ? 'bg-primary/5' : 'hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{medals[i] || `${i + 1}.`}</span>
                <span className={`text-xs font-medium ${i === 0 ? 'text-primary' : 'text-foreground/80'}`}>
                  {leader.name}
                </span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {leader.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
