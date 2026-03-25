import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, UserPlus } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SigningsEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  count: number;
}

export function SigningsLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SigningsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        
        // Get signups this week with signer info
        const { data: signups } = await supabase
          .from('rep_signups')
          .select('signed_by')
          .gte('signed_at', weekStart.toISOString())
          .not('signed_by', 'is', null);

        if (!signups || signups.length === 0) {
          setEntries([]);
          setIsLoading(false);
          return;
        }

        // Count by signer
        const countMap = new Map<string, number>();
        signups.forEach(s => {
          if (s.signed_by) {
            countMap.set(s.signed_by, (countMap.get(s.signed_by) || 0) + 1);
          }
        });

        const signerIds = Array.from(countMap.keys());

        // Get profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', signerIds);

        const leaderboard: SigningsEntry[] = (profiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          count: countMap.get(p.user_id) || 0,
        })).sort((a, b) => b.count - a.count);

        setEntries(leaderboard);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4 text-primary" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <span className="text-xs font-medium text-muted-foreground w-4 text-center">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No signings this week</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === user?.id;
        const rank = index + 1;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              isCurrentUser && "bg-primary/5"
            )}
          >
            <div className="w-6 flex justify-center">{getRankIcon(rank)}</div>
            
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {entry.full_name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isCurrentUser ? "text-primary" : "text-foreground"
              )}>
                {entry.full_name}
                {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
              </p>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold text-primary">{entry.count}</span>
              <span className="text-xs text-muted-foreground ml-1">signed</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}