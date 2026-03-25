import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { Flame, Star, Zap, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPData {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  rank: string;
  lessonsComplete: number;
  videosWatched: number;
  quizzesPassed: number;
}

const RANKS = [
  { level: 1, name: 'Recruit', minXP: 0 },
  { level: 2, name: 'Trainee', minXP: 100 },
  { level: 3, name: 'Closer', minXP: 300 },
  { level: 4, name: 'Hustler', minXP: 600 },
  { level: 5, name: 'Pro', minXP: 1000 },
  { level: 6, name: 'Elite', minXP: 1500 },
  { level: 7, name: 'Legend', minXP: 2500 },
];

function getRankInfo(xp: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXP) rank = r;
  }
  const nextRank = RANKS.find(r => r.minXP > xp);
  return {
    level: rank.level,
    rank: rank.name,
    nextLevelXP: nextRank?.minXP || rank.minXP + 500,
  };
}

export function RookieXPPanel() {
  const { user } = useAuth();
  const { streakData } = useStreak();
  const [xpData, setXpData] = useState<XPData | null>(null);

  useEffect(() => {
    const fetchXP = async () => {
      if (!user) return;

      const [lessonsRes, videosRes, quizzesRes] = await Promise.all([
        supabase.from('lesson_progress').select('id').eq('user_id', user.id).not('completed_at', 'is', null),
        supabase.from('video_progress').select('id').eq('user_id', user.id).eq('watched', true),
        supabase.from('lesson_progress').select('id').eq('user_id', user.id).eq('quiz_passed', true),
      ]);

      const lessonsComplete = lessonsRes.data?.length || 0;
      const videosWatched = videosRes.data?.length || 0;
      const quizzesPassed = quizzesRes.data?.length || 0;
      const streakBonus = (streakData.currentStreak || 0) * 10;

      const totalXP = lessonsComplete * 25 + videosWatched * 15 + quizzesPassed * 50 + streakBonus;
      const { level, rank, nextLevelXP } = getRankInfo(totalXP);

      setXpData({
        level,
        currentXP: totalXP,
        nextLevelXP,
        rank,
        lessonsComplete,
        videosWatched,
        quizzesPassed,
      });
    };

    fetchXP();
  }, [user, streakData.currentStreak]);

  if (!xpData) {
    return <div className="h-36 bg-card rounded-xl border border-border animate-pulse" />;
  }

  const progress = Math.min(100, Math.round((xpData.currentXP / xpData.nextLevelXP) * 100));

  return (
    <div className="relative bg-card rounded-xl border border-border overflow-hidden">
      {/* Gradient accent top */}
      <div className="h-1 bg-gradient-to-r from-primary via-yellow-400 to-primary" />
      
      <div className="p-4">
        {/* Level + Rank */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Level {xpData.level}</p>
              <p className="text-sm font-black text-foreground">{xpData.rank}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-primary tabular-nums">{xpData.currentXP} <span className="text-xs font-medium text-muted-foreground">XP</span></p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mb-3">
          <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {xpData.nextLevelXP - xpData.currentXP} XP to next level
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 flex-wrap">
          <StatPill icon={Zap} label="Lessons" value={xpData.lessonsComplete} color="text-primary" />
          <StatPill icon={Trophy} label="Quizzes" value={xpData.quizzesPassed} color="text-primary" />
          {streakData.currentStreak > 0 && (
            <StatPill icon={Flame} label="Streak" value={streakData.currentStreak} color="text-primary" />
          )}
          <StatPill icon={TrendingUp} label="Videos" value={xpData.videosWatched} color="text-blue-400" />
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-1">
      <Icon className={cn("w-3 h-3", color)} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}
