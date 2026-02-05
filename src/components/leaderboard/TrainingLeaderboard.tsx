import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Point weights for leaderboard scoring
const POINTS = {
  LESSON_COMPLETED: 100,      // 100 pts per lesson completed
  STREAK_DAY: 10,             // 10 pts per streak day
  HOUR_LOGGED: 5,             // 5 pts per hour logged this week
  QUIZ_SCORE_MULTIPLIER: 3,   // 3 pts per % average quiz score
};

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  streakDays: number;
  hoursThisWeek: number;
  avgQuizScore: number;
  totalPoints: number;
  breakdown: {
    lessonsPoints: number;
    streakPoints: number;
    hoursPoints: number;
    quizPoints: number;
  };
}

export function TrainingLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all rookies
        const { data: rookieRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'rookie');

        if (!rookieRoles || rookieRoles.length === 0) {
          setEntries([]);
          setIsLoading(false);
          return;
        }

        const rookieIds = rookieRoles.map(r => r.user_id);

        // Fetch all data in parallel
        const [profilesRes, totalLessonsRes, progressRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, time_this_week_minutes')
            .in('user_id', rookieIds)
            .not('status', 'eq', 'nlc'),
          supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('lesson_progress')
            .select('user_id, lesson_id, quiz_score, completed_at')
            .in('user_id', rookieIds)
            .not('completed_at', 'is', null)
        ]);

        const profiles = profilesRes.data || [];
        const totalLessons = totalLessonsRes.count || 1;
        const progress = progressRes.data || [];

        // Calculate completion and quiz scores per user
        const userStats = new Map<string, { completed: number; quizScores: number[]; }>();
        progress.forEach(p => {
          const existing = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          existing.completed++;
          if (p.quiz_score !== null && p.quiz_score !== undefined) {
            existing.quizScores.push(p.quiz_score);
          }
          userStats.set(p.user_id, existing);
        });

        // Build leaderboard entries
        const leaderboard: LeaderboardEntry[] = profiles.map(p => {
          const stats = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          const lessonsCompleted = stats.completed;
          const avgQuizScore = stats.quizScores.length > 0 
            ? Math.round(stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length)
            : 0;
          const hoursThisWeek = Math.round((p.time_this_week_minutes || 0) / 60 * 10) / 10;
          
          // Streak days placeholder (stored in localStorage client-side)
          const streakDays = 0;
          
          // Calculate points
          const lessonsPoints = lessonsCompleted * POINTS.LESSON_COMPLETED;
          const streakPoints = streakDays * POINTS.STREAK_DAY;
          const hoursPoints = Math.round(hoursThisWeek * POINTS.HOUR_LOGGED);
          const quizPoints = Math.round(avgQuizScore * POINTS.QUIZ_SCORE_MULTIPLIER);
          const totalPoints = lessonsPoints + streakPoints + hoursPoints + quizPoints;

          return {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            lessonsCompleted,
            totalLessons,
            streakDays,
            hoursThisWeek,
            avgQuizScore,
            totalPoints,
            breakdown: {
              lessonsPoints,
              streakPoints,
              hoursPoints,
              quizPoints,
            },
          };
        }).sort((a, b) => b.totalPoints - a.totalPoints);

        setEntries(leaderboard.slice(0, 20));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

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
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No training data yet</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        {/* Point breakdown legend */}
        <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Points: Lessons (100) • Streak (10/day) • Hours (5/hr) • Quiz Avg (3/%)</span>
          </div>
        </div>

        {/* Top 3 Feature Section */}
        {entries.length >= 3 && (
          <div className="px-4 py-4 bg-gradient-to-b from-muted/20 to-transparent border-b border-border/50">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <div 
                className="text-center cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedEntry(entries[1])}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden mx-auto mb-1 ring-2 ring-gray-400">
                  {entries[1].avatar_url ? (
                    <img src={entries[1].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{entries[1].full_name.charAt(0)}</span>
                  )}
                </div>
                <Medal className="w-5 h-5 text-gray-400 mx-auto" />
                <p className="text-xs font-medium truncate max-w-[80px]">{entries[1].full_name.split(' ')[0]}</p>
                <p className="text-sm font-bold text-primary">{entries[1].totalPoints.toLocaleString()}</p>
              </div>

              {/* 1st Place */}
              <div 
                className="text-center cursor-pointer hover:scale-105 transition-transform -mt-4"
                onClick={() => setSelectedEntry(entries[0])}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden mx-auto mb-1 ring-4 ring-yellow-500 shadow-lg shadow-yellow-500/20">
                  {entries[0].avatar_url ? (
                    <img src={entries[0].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">{entries[0].full_name.charAt(0)}</span>
                  )}
                </div>
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto" />
                <p className="text-sm font-medium truncate max-w-[100px]">{entries[0].full_name.split(' ')[0]}</p>
                <p className="text-lg font-bold text-primary">{entries[0].totalPoints.toLocaleString()}</p>
              </div>

              {/* 3rd Place */}
              <div 
                className="text-center cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedEntry(entries[2])}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden mx-auto mb-1 ring-2 ring-amber-600">
                  {entries[2].avatar_url ? (
                    <img src={entries[2].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{entries[2].full_name.charAt(0)}</span>
                  )}
                </div>
                <Award className="w-5 h-5 text-amber-600 mx-auto" />
                <p className="text-xs font-medium truncate max-w-[80px]">{entries[2].full_name.split(' ')[0]}</p>
                <p className="text-sm font-bold text-primary">{entries[2].totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="divide-y divide-border/50">
          {entries.slice(3).map((entry, index) => {
            const isCurrentUser = entry.user_id === user?.id;
            const rank = index + 4;

            return (
              <div
                key={entry.user_id}
                onClick={() => setSelectedEntry(entry)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/30",
                  isCurrentUser && "bg-primary/5"
                )}
              >
                <div className="w-8 flex justify-center">
                  <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
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
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <BookOpen className="w-3 h-3" /> {entry.lessonsCompleted}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-orange-500" /> {entry.streakDays}d
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {entry.hoursThisWeek}h
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Target className="w-3 h-3" /> {entry.avgQuizScore}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{entry.totalPoints.toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Point Breakdown Dialog */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedEntry?.avatar_url ? (
                    <img src={selectedEntry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-medium text-muted-foreground">
                      {selectedEntry?.full_name.charAt(0)}
                    </span>
                  )}
                </div>
                {selectedEntry?.full_name} - Score Breakdown
              </DialogTitle>
            </DialogHeader>
            
            {selectedEntry && (
              <div className="space-y-4 pt-2">
                {/* Lessons */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium">Lessons Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEntry.lessonsCompleted} lessons × {POINTS.LESSON_COMPLETED} pts
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-success">
                    +{selectedEntry.breakdown.lessonsPoints.toLocaleString()}
                  </span>
                </div>

                {/* Streak */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Training Streak</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEntry.streakDays} days × {POINTS.STREAK_DAY} pts
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-orange-500">
                    +{selectedEntry.breakdown.streakPoints.toLocaleString()}
                  </span>
                </div>

                {/* Hours */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Hours This Week</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEntry.hoursThisWeek} hrs × {POINTS.HOUR_LOGGED} pts
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-500">
                    +{selectedEntry.breakdown.hoursPoints.toLocaleString()}
                  </span>
                </div>

                {/* Quiz Score */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Avg Quiz Score</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEntry.avgQuizScore}% × {POINTS.QUIZ_SCORE_MULTIPLIER} pts
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-500">
                    +{selectedEntry.breakdown.quizPoints.toLocaleString()}
                  </span>
                </div>

                {/* Total */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">Total Score</p>
                    <span className="text-2xl font-bold text-primary">
                      {selectedEntry.totalPoints.toLocaleString()} pts
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rank #{entries.findIndex(e => e.user_id === selectedEntry.user_id) + 1} of {entries.length}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}