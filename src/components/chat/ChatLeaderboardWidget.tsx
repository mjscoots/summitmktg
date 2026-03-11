import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  count: number;
}

export function ChatLeaderboardWidget() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('user_id')
        .eq('is_ai', false)
        .gte('created_at', todayStart.toISOString());

      if (!messages || messages.length === 0) {
        setLeaders([]);
        setIsLoading(false);
        return;
      }

      // Count messages per user
      const counts: Record<string, number> = {};
      messages.forEach(m => {
        counts[m.user_id] = (counts[m.user_id] || 0) + 1;
      });

      const topUserIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ user_id: id, count }));

      if (topUserIds.length === 0) {
        setLeaders([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', topUserIds.map(u => u.user_id));

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setLeaders(
        topUserIds.map(u => ({
          ...u,
          full_name: profileMap.get(u.user_id)?.full_name || 'Unknown',
          avatar_url: profileMap.get(u.user_id)?.avatar_url || null,
        }))
      );
      setIsLoading(false);
    };

    fetchLeaders();
    const interval = setInterval(fetchLeaders, 120000); // Refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  if (isLoading || leaders.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="px-4 py-2 border-b border-border/30 flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10">
        <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 flex-shrink-0">Today</span>
        <div className="flex items-center gap-3 ml-auto">
          {leaders.map((leader, i) => (
            <div key={leader.user_id} className="flex items-center gap-1.5">
              <span className="text-xs">{medals[i]}</span>
              <UserAvatar
                avatarUrl={leader.avatar_url}
                fullName={leader.full_name}
                size="xs"
              />
              <span className="text-[11px] font-medium text-foreground/70 max-w-[60px] truncate">
                {leader.full_name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
