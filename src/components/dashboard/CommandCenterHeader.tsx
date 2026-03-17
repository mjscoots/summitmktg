import { Clock, Mic, Zap, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useMyPoints } from '@/hooks/useMyPoints';

interface PendingPitch {
  id: string;
  user_id: string;
  lesson_id: string;
  submitted_at: string;
  user_name: string;
  lesson_title: string;
}

export function CommandCenterHeader() {
  const { profile, role, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPitches, setPendingPitches] = useState<PendingPitch[]>([]);
  const { data: pointsData } = useMyPoints();
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const isOwner = role === 'owner';

  useEffect(() => {
    if (profile?.full_name) setIsLoading(false);
  }, [profile?.full_name]);

  useEffect(() => {
    if (!user) return;
    const fetchRank = async () => {
      try {
        const { data } = await (supabase.rpc as any)('get_current_leaderboard');
        if (data) {
          const myEntry = data.find((e: any) => e.user_id === user.id);
          if (myEntry) setLeaderboardRank(Number(myEntry.rank));
        }
      } catch {}
    };
    fetchRank();
  }, [user]);

  useEffect(() => {
    const fetchPitches = async () => {
      const { data: pitchData } = await supabase
        .from('pitch_approval_requests')
        .select('id, user_id, lesson_id, submitted_at')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (!pitchData || pitchData.length === 0) { setPendingPitches([]); return; }

      const userIds = [...new Set(pitchData.map(p => p.user_id))];
      const lessonIds = [...new Set(pitchData.map(p => p.lesson_id))];

      const [profilesRes, lessonsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        supabase.from('training_lessons').select('id, title').in('id', lessonIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
      const lessonMap = new Map((lessonsRes.data || []).map(l => [l.id, l.title]));

      setPendingPitches(pitchData.map(p => ({
        ...p,
        user_name: profileMap.get(p.user_id)?.split(' ')[0] || 'Unknown',
        lesson_title: lessonMap.get(p.lesson_id) || 'Unknown',
      })));
    };

    fetchPitches();
    const channel = supabase
      .channel('pitch-approvals-command')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_approval_requests' }, () => fetchPitches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const hoursToday = pointsData ? pointsData.timeTodayMinutes / 60 : 0;
  const dailyPts = pointsData
    ? pointsData.capsToday.hours.earned + pointsData.capsToday.chat.earned + pointsData.capsToday.lesson.earned + pointsData.capsToday.video.earned + pointsData.capsToday.manual.earned
    : 0;

  return (
    <div className="mb-5">
      {/* Glass hero — control panel */}
      <div className="glass-card rounded-2xl p-5 mb-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: isOwner ? 'var(--gradient-gold)' : 'var(--gradient-primary)' }} />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none" style={{ background: 'hsl(263 84% 58%)' }} />
        
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground leading-tight">
              Welcome back, <span className={isOwner ? "gradient-text-gold" : "gradient-text"}>{firstName}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOwner ? "Full command. Total visibility." : "Lead with pressure. Train with purpose."}
            </p>
          </div>
        </div>

        {/* Manager stat blocks */}
        {pointsData && (
          <div className="grid grid-cols-3 gap-2.5 mt-4 relative z-10">
            {[
              { icon: Flame, value: `${dailyPts}`, label: 'PTS TODAY', color: 'text-amber-400', glow: 'hsl(43 96% 56% / 0.12)' },
              { icon: Clock, value: `${hoursToday.toFixed(1)}h`, label: 'TRAINING', color: 'text-primary', glow: 'hsl(217 91% 60% / 0.12)' },
              { icon: Trophy, value: leaderboardRank ? `#${leaderboardRank}` : '—', label: 'RANK', color: 'text-yellow-400', glow: 'hsl(43 96% 56% / 0.1)' },
            ].map(({ icon: Icon, value, label, color, glow }) => (
              <div
                key={label}
                className="rounded-xl p-2.5 text-center hover:-translate-y-0.5 transition-all duration-250 border border-border/20"
                style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%), hsl(230 20% 7%))', boxShadow: `0 0 16px -6px ${glow}` }}
              >
                <Icon className={cn("w-3.5 h-3.5 mx-auto mb-1", color)} />
                <p className="text-lg font-bold text-foreground tabular-nums leading-tight animate-count-up">{value}</p>
                <p className="text-[7px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Pitch Approvals */}
      {pendingPitches.length > 0 && (
        <div className="glass-card rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pending Pitches ({pendingPitches.length})
              </p>
            </div>
            <button
              onClick={() => navigate('/app/pitch-approvals')}
              className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Review →
            </button>
          </div>
          <div className="space-y-0.5">
            {pendingPitches.map((pitch) => {
              const hoursAgo = (Date.now() - new Date(pitch.submitted_at).getTime()) / (1000 * 60 * 60);
              const isOverdue = hoursAgo >= 24;
              return (
                <button
                  key={pitch.id}
                  onClick={() => navigate('/app/pitch-approvals')}
                  className="w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-lg hover:bg-muted/20 transition-all duration-250 hover:-translate-y-px"
                >
                  <span className="text-foreground/80 flex items-center gap-2">
                    <Mic className="w-3 h-3 text-muted-foreground/50" />
                    {pitch.user_name} — {pitch.lesson_title}
                  </span>
                  <span className={cn("text-[10px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground/60")}>
                    {formatDistanceToNow(new Date(pitch.submitted_at), { addSuffix: true })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
