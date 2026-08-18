import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingList } from '@/components/shared/LoadingList';

interface RecruitingEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  signed: number;
  booked: number;
  active_claims: number;
}

const RANK_COLOR = ['text-amber-400', 'text-slate-300', 'text-orange-400'];

export function RecruitingLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RecruitingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_recruiting_leaderboard', { _limit: 20 });
      if (!error && data) setEntries(data as RecruitingEntry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <LoadingList rows={5} />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No signings yet this month"
        description="The first rep to close a lead takes the top spot."
      />
    );
  }

  return (
    <div className="divide-y divide-border/40">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Signed this month
        </span>
      </div>
      {entries.map((e, i) => (
        <div
          key={e.user_id}
          className={cn('flex items-center gap-3 px-4 py-3', e.user_id === user?.id && 'bg-primary/[0.06]')}
        >
          <span className={cn('w-6 text-center text-sm font-black', RANK_COLOR[i] || 'text-muted-foreground')}>
            {i + 1}
          </span>
          <UserAvatar avatarUrl={e.avatar_url} fullName={e.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">
              {e.nickname || e.full_name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {e.booked} booked · {e.active_claims} active
            </p>
          </div>
          <span className="text-base font-black text-primary">{e.signed}</span>
        </div>
      ))}
    </div>
  );
}
