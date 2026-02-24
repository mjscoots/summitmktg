import { Users, UserCheck, GraduationCap, TrendingUp, Ghost, AlertTriangle, Mic, Clock } from 'lucide-react';
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
  teamCompletion: number;
  bootcampIncomplete: number;
  ghostMode: number;
  topPerformers: { name: string; progress: number }[];
  needsAttention: { name: string; progress: number }[];
}

export function CommandCenterHeader() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    teamCompletion: 0,
    bootcampIncomplete: 0,
    ghostMode: 0,
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
        const { data: downline } = await supabase
          .rpc('get_user_downline', { _manager_name: profile.full_name });

        const members = downline || [];
        const rookieUserIds: string[] = [];

        members.forEach((m: any) => {
          if (m.role !== 'manager' && m.role !== 'admin') {
            rookieUserIds.push(m.user_id);
          }
        });

        // Bootcamp incomplete
        let bootcampIncomplete = 0;
        if (rookieUserIds.length > 0) {
          const { count } = await supabase
            .from('bootcamp_progress')
            .select('*', { count: 'exact', head: true })
            .in('user_id', rookieUserIds)
            .eq('bootcamp_completed', false);
          bootcampIncomplete = count || 0;
        }

        // Ghost mode (3+ days inactive)
        let ghostMode = 0;
        if (rookieUserIds.length > 0) {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('user_id', rookieUserIds)
            .lt('last_active_at', threeDaysAgo.toISOString());
          ghostMode = count || 0;
        }

        // Training progress
        let avgProgress = 0;
        const memberProgress: { name: string; progress: number }[] = [];

        if (rookieUserIds.length > 0) {
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
            rookieUserIds.forEach((uid) => {
              const completed = completionMap.get(uid) || 0;
              const pct = Math.round((completed / totalLessons) * 100);
              totalProgress += pct;
              const member = members.find((m: any) => m.user_id === uid);
              if (member) {
                memberProgress.push({ name: member.full_name, progress: pct });
              }
            });
            avgProgress = rookieUserIds.length > 0 ? Math.round(totalProgress / rookieUserIds.length) : 0;
          }
        }

        const sorted = [...memberProgress].sort((a, b) => b.progress - a.progress);
        const topPerformers = sorted.slice(0, 5).map(m => ({ name: m.name, progress: m.progress }));
        const needsAttention = sorted.filter(m => m.progress < 50).sort((a, b) => a.progress - b.progress).slice(0, 5).map(m => ({ name: m.name, progress: m.progress }));

        setStats({
          teamCompletion: avgProgress,
          bootcampIncomplete,
          ghostMode,
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

  return (
    <div className="mb-6">
      {/* Hero */}
      <div className="relative h-24 rounded-xl overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-950 to-primary/40" />
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

      {/* 3 KPI Strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => navigate('/app/team')}
          className="bg-card rounded-xl border border-border/60 p-4 text-left hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-primary/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Team Completion</span>
          </div>
          <span className={cn(
            "text-2xl font-black tabular-nums",
            stats.teamCompletion >= 75 ? "text-success" : stats.teamCompletion >= 50 ? "text-yellow-400" : "text-destructive"
          )}>
            {isLoading ? '—' : `${stats.teamCompletion}%`}
          </span>
        </button>

        <button
          onClick={() => navigate('/app/team')}
          className="bg-card rounded-xl border border-border/60 p-4 text-left hover:border-destructive/40 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bootcamp Incomplete</span>
          </div>
          <span className={cn(
            "text-2xl font-black tabular-nums",
            stats.bootcampIncomplete > 0 ? "text-destructive" : "text-success"
          )}>
            {isLoading ? '—' : stats.bootcampIncomplete}
          </span>
        </button>

        <button
          onClick={() => navigate('/app/team')}
          className="bg-card rounded-xl border border-border/60 p-4 text-left hover:border-yellow-500/40 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Ghost className="w-4 h-4 text-yellow-500/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ghost Mode (3d+)</span>
          </div>
          <span className={cn(
            "text-2xl font-black tabular-nums",
            stats.ghostMode > 0 ? "text-yellow-400" : "text-success"
          )}>
            {isLoading ? '—' : stats.ghostMode}
          </span>
        </button>
      </div>

      {/* Action Center + Top/Bottom 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top 5 */}
        {!isLoading && stats.topPerformers.length > 0 && (
          <div className="bg-card rounded-lg border border-border/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-2">🏆 Top 5</p>
            <div className="space-y-1.5">
              {stats.topPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate">{p.name}</span>
                  <span className="text-success font-bold">{p.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!isLoading && stats.needsAttention.length > 0 && (
          <div className="bg-card rounded-lg border border-destructive/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-2">⚠️ Bottom 5</p>
            <div className="space-y-1.5">
              {stats.needsAttention.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate">{p.name}</span>
                  <span className="text-destructive font-bold">{p.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Pitch Approvals */}
      {pendingPitches.length > 0 && (
        <div className="bg-card rounded-lg border border-border/40 p-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pending Pitch Approvals ({pendingPitches.length})
              </p>
            </div>
            <button
              onClick={() => navigate('/app/pitch-approvals')}
              className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Review All →
            </button>
          </div>
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
        </div>
      )}
    </div>
  );
}
