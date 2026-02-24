import { Users, UserCheck, GraduationCap, TrendingUp, Mic, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface PendingPitch {
  id: string;
  user_id: string;
  lesson_id: string;
  submitted_at: string;
  user_name: string;
  lesson_title: string;
}

interface Stats {
  managerCount: number;
  rookieCount: number;
  avgTrainingProgress: number;
  topPerformers: { name: string; progress: number }[];
  needsAttention: { name: string; progress: number }[];
}

export function CommandCenterHeader() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    managerCount: 0,
    rookieCount: 0,
    avgTrainingProgress: 0,
    topPerformers: [],
    needsAttention: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPitches, setPendingPitches] = useState<PendingPitch[]>([]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.full_name) return;
      try {
        // Get full downline using RPC
        const { data: downline } = await supabase
          .rpc('get_user_downline', { _manager_name: profile.full_name });

        const members = downline || [];
        let managers = 0;
        let rookies = 0;
        const rookieUserIds: string[] = [];

        members.forEach((m: any) => {
          if (m.role === 'manager' || m.role === 'admin') {
            managers++;
          } else {
            rookies++;
            rookieUserIds.push(m.user_id);
          }
        });

        // Get training progress for rookies
        let avgProgress = 0;
        const memberProgress: { name: string; progress: number; userId: string }[] = [];

        if (rookieUserIds.length > 0) {
          // Get reachable lesson IDs
          const { data: courses } = await supabase
            .from('training_courses')
            .select(`id, target_role, training_modules ( id, training_lessons ( id, is_active ) )`)
            .eq('is_active', true);

          const reachableLessonIds = new Set<string>();
          (courses || []).forEach((course: any) => {
            if (course.target_role !== null && course.target_role !== 'rookie') return;
            course.training_modules?.forEach((mod: any) => {
              mod.training_lessons?.forEach((lesson: any) => {
                if (lesson.is_active !== false) reachableLessonIds.add(lesson.id);
              });
            });
          });

          const totalLessons = reachableLessonIds.size;

          if (totalLessons > 0) {
            const { data: progressData } = await supabase
              .from('lesson_progress')
              .select('user_id, lesson_id')
              .in('user_id', rookieUserIds)
              .not('completed_at', 'is', null);

            const completionMap = new Map<string, number>();
            (progressData || []).forEach((p: any) => {
              if (reachableLessonIds.has(p.lesson_id)) {
                completionMap.set(p.user_id, (completionMap.get(p.user_id) || 0) + 1);
              }
            });

            let totalProgress = 0;
            const rookieMembers = members.filter((m: any) => m.role === 'rookie' || (!m.role || m.role === 'rookie'));
            
            rookieUserIds.forEach((uid) => {
              const completed = completionMap.get(uid) || 0;
              const pct = Math.round((completed / totalLessons) * 100);
              totalProgress += pct;
              const member = members.find((m: any) => m.user_id === uid);
              if (member) {
                memberProgress.push({ name: member.full_name, progress: pct, userId: uid });
              }
            });

            avgProgress = rookieUserIds.length > 0 ? Math.round(totalProgress / rookieUserIds.length) : 0;
          }
        }

        // Sort for top/bottom performers
        const sorted = [...memberProgress].sort((a, b) => b.progress - a.progress);
        const topPerformers = sorted.slice(0, 3).map(m => ({ name: m.name.split(' ')[0], progress: m.progress }));
        const needsAttention = sorted.filter(m => m.progress < 50).sort((a, b) => a.progress - b.progress).slice(0, 3).map(m => ({ name: m.name.split(' ')[0], progress: m.progress }));

        setStats({
          managerCount: managers,
          rookieCount: rookies,
          avgTrainingProgress: avgProgress,
          topPerformers,
          needsAttention,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [profile?.full_name]);

  // Fetch pending pitch approvals
  useEffect(() => {
    const fetchPitches = async () => {
      const { data: pitchData } = await supabase
        .from('pitch_approval_requests')
        .select('id, user_id, lesson_id, submitted_at')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (!pitchData || pitchData.length === 0) {
        setPendingPitches([]);
        return;
      }

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

  return (
    <div className="mb-6">
      {/* Simplified Hero */}
      <div className="relative h-28 rounded-xl overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-950 to-primary/40" />
        <svg className="absolute bottom-0 left-0 right-0 w-full h-12 opacity-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,120 L0,80 L100,60 L200,85 L300,45 L400,70 L500,30 L600,55 L700,25 L800,50 L900,20 L1000,40 L1100,15 L1200,35 L1200,120 Z" fill="currentColor" className="text-primary/30" />
        </svg>
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Lead with pressure. Train with purpose.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Metric: Team Training Progress */}
      <div className="bg-card rounded-xl border border-border/60 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Team Training Progress</span>
          </div>
          <span className={cn(
            "text-2xl font-black tabular-nums",
            stats.avgTrainingProgress >= 75 ? "text-success" : stats.avgTrainingProgress >= 50 ? "text-yellow-400" : "text-destructive"
          )}>
            {isLoading ? '—' : `${stats.avgTrainingProgress}%`}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              stats.avgTrainingProgress >= 75 ? "bg-success" : stats.avgTrainingProgress >= 50 ? "bg-yellow-400" : "bg-destructive"
            )}
            style={{ width: `${isLoading ? 0 : stats.avgTrainingProgress}%` }}
          />
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-muted-foreground">Managers:</span>
            <span className="font-semibold text-foreground">{isLoading ? '—' : stats.managerCount}</span>
          </div>
          <div className="h-3 w-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-success/60" />
            <span className="text-muted-foreground">Rookies:</span>
            <span className="font-semibold text-foreground">{isLoading ? '—' : stats.rookieCount}</span>
          </div>
          <div className="h-3 w-px bg-border/50" />
          <button 
            onClick={() => navigate('/app/team')}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors ml-auto"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-medium">View Team</span>
          </button>
        </div>
      </div>

      {/* Top/Bottom performers - only show if data loaded */}
      {!isLoading && (stats.topPerformers.length > 0 || stats.needsAttention.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.topPerformers.length > 0 && (
            <div className="bg-card rounded-lg border border-border/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-2">🏆 Top Performers</p>
              <div className="space-y-1.5">
                {stats.topPerformers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="text-success font-bold">{p.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.needsAttention.length > 0 && (
            <div className="bg-card rounded-lg border border-destructive/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-2">⚠️ Needs Attention</p>
              <div className="space-y-1.5">
                {stats.needsAttention.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="text-destructive font-bold">{p.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Pitch Approvals */}
      <div className="bg-card rounded-lg border border-border/40 p-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pending Pitch Approvals ({pendingPitches.length})
            </p>
          </div>
          {pendingPitches.length > 0 && (
            <button
              onClick={() => navigate('/app/pitch-approvals')}
              className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Review All →
            </button>
          )}
        </div>
        {pendingPitches.length === 0 ? (
          <p className="text-xs text-muted-foreground">✅ No pending pitch approvals</p>
        ) : (
          <div className="space-y-1.5">
            {pendingPitches.map((pitch) => {
              const hoursAgo = (Date.now() - new Date(pitch.submitted_at).getTime()) / (1000 * 60 * 60);
              const isOverdue = hoursAgo >= 24;
              return (
                <button
                  key={pitch.id}
                  onClick={() => navigate('/app/pitch-approvals')}
                  className="w-full flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-foreground font-medium flex items-center gap-1">
                    <Mic className="w-3 h-3 text-primary/60" />
                    {pitch.user_name} — {pitch.lesson_title}
                  </span>
                  <span className={cn("text-[10px] flex items-center gap-0.5", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {isOverdue && <AlertTriangle className="w-3 h-3" />}
                    {formatDistanceToNow(new Date(pitch.submitted_at), { addSuffix: true })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
