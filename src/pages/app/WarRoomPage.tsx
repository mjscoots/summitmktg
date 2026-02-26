import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { Swords, Activity, Users, Clock, ChevronRight, AlertTriangle, GraduationCap, ClipboardCheck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type WarRoomTab = 'pulse' | 'team' | 'activity';

interface TeamMemberRow {
  user_id: string;
  full_name: string;
  last_active_at: string | null;
  trainingPct: number;
  checklistDone: boolean;
}

interface TimeEntry {
  user_id: string;
  full_name: string;
  totalMinutes: number;
  weeklyMinutes: number;
  requiredMinutes: number;
  status: 'acceptable' | 'below';
}

export default function WarRoomPage() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Soldier';
  const [activeTab, setActiveTab] = useState<WarRoomTab>('pulse');

  const TABS: { id: WarRoomTab; label: string; icon: typeof Activity }[] = [
    { id: 'pulse', label: 'Pulse', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Hero */}
        <div className="relative h-24 rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-red-900/60 to-orange-900/40" />
          <div className="absolute inset-0 flex items-center px-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                <Swords className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">WAR ROOM</h1>
                <p className="text-xs text-white/50">It's game day, {firstName}. Execute or get left behind.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="p-1 bg-muted/50 rounded-xl mb-6 border border-border/30">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md shadow-primary/10 border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", activeTab === tab.id && "text-primary")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'pulse' && <PulseTab managerName={profile?.full_name || ''} />}
        {activeTab === 'team' && <TeamTab managerName={profile?.full_name || ''} />}
        {activeTab === 'activity' && <ActivityTab managerName={profile?.full_name || ''} />}
      </div>
    </AppLayout>
  );
}

/* ── Pulse Tab ── */
function PulseTab({ managerName }: { managerName: string }) {
  const [stats, setStats] = useState({ trainingPct: 0, checklistPct: 0, oneOnOnePct: 0, totalReps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!managerName) return;
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: managerName });
      const reps = (downline || []).filter((m: any) => m.role !== 'manager' && m.role !== 'admin');
      const repIds = reps.map((r: any) => r.user_id);
      if (repIds.length === 0) { setLoading(false); return; }

      // Training %
      const { data: courses } = await supabase
        .from('training_courses')
        .select('id, target_role, training_modules ( id, training_lessons ( id, is_active ) )')
        .eq('is_active', true);
      const lessonIds = new Set<string>();
      (courses || []).forEach((c: any) => {
        if (c.target_role !== null && c.target_role !== 'rookie') return;
        c.training_modules?.forEach((m: any) => m.training_lessons?.forEach((l: any) => { if (l.is_active !== false) lessonIds.add(l.id); }));
      });
      let avgTraining = 0;
      if (lessonIds.size > 0) {
        const { data: prog } = await supabase.from('lesson_progress').select('user_id, lesson_id').in('user_id', repIds).not('completed_at', 'is', null);
        const map = new Map<string, number>();
        (prog || []).forEach((p: any) => { if (lessonIds.has(p.lesson_id)) map.set(p.user_id, (map.get(p.user_id) || 0) + 1); });
        let total = 0;
        repIds.forEach((uid: string) => { total += Math.round(((map.get(uid) || 0) / lessonIds.size) * 100); });
        avgTraining = Math.round(total / repIds.length);
      }

      // Checklist %
      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const completedChecklist = (bp || []).filter((b: any) => b.bootcamp_completed).length;
      const checklistPct = repIds.length > 0 ? Math.round((completedChecklist / repIds.length) * 100) : 0;

      // 1:1 Completion % (this week)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const { count: completedCount } = await supabase
        .from('scheduling_requests')
        .select('*', { count: 'exact', head: true })
        .in('recipient_id', repIds)
        .eq('status', 'completed')
        .gte('completed_at', weekStart.toISOString());
      const oneOnOnePct = repIds.length > 0 ? Math.round(((completedCount || 0) / repIds.length) * 100) : 0;

      setStats({ trainingPct: avgTraining, checklistPct, oneOnOnePct, totalReps: repIds.length });
      setLoading(false);
    };
    fetch();
  }, [managerName]);

  const metrics = [
    { icon: GraduationCap, label: 'Team Training', value: `${stats.trainingPct}%`, color: stats.trainingPct >= 75 ? 'text-success' : stats.trainingPct >= 50 ? 'text-yellow-400' : 'text-destructive' },
    { icon: ClipboardCheck, label: 'Summer Checklist', value: `${stats.checklistPct}%`, color: stats.checklistPct >= 75 ? 'text-success' : 'text-yellow-400' },
    { icon: MessageSquare, label: '1:1 Completion', value: `${stats.oneOnOnePct}%`, color: stats.oneOnOnePct >= 75 ? 'text-success' : 'text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card rounded-xl border border-border/50 p-5 text-center">
          <m.icon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className={cn("text-3xl font-black tabular-nums", m.color)}>{loading ? '—' : m.value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Team Tab ── */
function TeamTab({ managerName }: { managerName: string }) {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<'name' | 'training' | 'checklist' | 'activity'>('training');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      if (!managerName) return;
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: managerName });
      const reps = (downline || []).filter((m: any) => m.role !== 'manager' && m.role !== 'admin');
      const repIds = reps.map((r: any) => r.user_id);
      if (repIds.length === 0) { setLoading(false); return; }

      // Profiles
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, last_active_at').in('user_id', repIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Lessons
      const { data: courses } = await supabase
        .from('training_courses')
        .select('id, target_role, training_modules ( id, training_lessons ( id, is_active ) )')
        .eq('is_active', true);
      const lessonIds = new Set<string>();
      (courses || []).forEach((c: any) => {
        if (c.target_role !== null && c.target_role !== 'rookie') return;
        c.training_modules?.forEach((m: any) => m.training_lessons?.forEach((l: any) => { if (l.is_active !== false) lessonIds.add(l.id); }));
      });
      const { data: prog } = await supabase.from('lesson_progress').select('user_id, lesson_id').in('user_id', repIds).not('completed_at', 'is', null);
      const lessonMap = new Map<string, number>();
      (prog || []).forEach((p: any) => { if (lessonIds.has(p.lesson_id)) lessonMap.set(p.user_id, (lessonMap.get(p.user_id) || 0) + 1); });

      // Checklist
      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const checkMap = new Map((bp || []).map(b => [b.user_id, b.bootcamp_completed]));

      const rows: TeamMemberRow[] = repIds.map((uid: string) => {
        const p = profileMap.get(uid);
        return {
          user_id: uid,
          full_name: p?.full_name || 'Unknown',
          last_active_at: p?.last_active_at || null,
          trainingPct: lessonIds.size > 0 ? Math.round(((lessonMap.get(uid) || 0) / lessonIds.size) * 100) : 0,
          checklistDone: checkMap.get(uid) || false,
        };
      });

      setMembers(rows);
      setLoading(false);
    };
    fetch();
  }, [managerName]);

  const sorted = [...members].sort((a, b) => {
    if (sortKey === 'name') return a.full_name.localeCompare(b.full_name);
    if (sortKey === 'training') return b.trainingPct - a.trainingPct;
    if (sortKey === 'checklist') return (b.checklistDone ? 1 : 0) - (a.checklistDone ? 1 : 0);
    if (sortKey === 'activity') return (new Date(b.last_active_at || 0).getTime()) - (new Date(a.last_active_at || 0).getTime());
    return 0;
  });

  const headers: { key: typeof sortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'training', label: 'Training %' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'activity', label: 'Last Active' },
  ];

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading team...</div>;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30">
        {headers.map(h => (
          <button
            key={h.key}
            onClick={() => setSortKey(h.key)}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider text-left transition-colors",
              sortKey === h.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {h.label}
          </button>
        ))}
      </div>
      {/* Rows */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No reps found</p>
      ) : sorted.map((m) => (
        <div key={m.user_id} className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 hover:bg-muted/20 transition-colors items-center">
          <span className="text-sm font-medium text-foreground truncate">{m.full_name}</span>
          <div className="flex items-center gap-2">
            <Progress value={m.trainingPct} className="h-1.5 flex-1 bg-muted max-w-[80px]" />
            <span className={cn("text-xs font-bold tabular-nums", m.trainingPct >= 75 ? "text-success" : m.trainingPct >= 50 ? "text-yellow-400" : "text-destructive")}>{m.trainingPct}%</span>
          </div>
          <span className={cn("text-xs font-semibold", m.checklistDone ? "text-success" : "text-destructive")}>{m.checklistDone ? '✓ Done' : '✗ Incomplete'}</span>
          <span className="text-[11px] text-muted-foreground">
            {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : 'Never'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Activity Tab ── */
function ActivityTab({ managerName }: { managerName: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredMinutes, setRequiredMinutes] = useState(120); // 2 hours default
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      if (!managerName) return;
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: managerName });
      const reps = (downline || []).filter((m: any) => m.role !== 'manager' && m.role !== 'admin');
      const repIds = reps.map((r: any) => r.user_id);
      if (repIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', repIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      // Weekly time
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const { data: timeData } = await supabase
        .from('daily_training_time')
        .select('user_id, total_minutes, date')
        .in('user_id', repIds);

      const totalMap = new Map<string, number>();
      const weeklyMap = new Map<string, number>();
      (timeData || []).forEach(t => {
        totalMap.set(t.user_id, (totalMap.get(t.user_id) || 0) + t.total_minutes);
        if (new Date(t.date) >= weekStart) {
          weeklyMap.set(t.user_id, (weeklyMap.get(t.user_id) || 0) + t.total_minutes);
        }
      });

      const rows: TimeEntry[] = repIds.map((uid: string) => {
        const weekly = weeklyMap.get(uid) || 0;
        return {
          user_id: uid,
          full_name: nameMap.get(uid) || 'Unknown',
          totalMinutes: totalMap.get(uid) || 0,
          weeklyMinutes: weekly,
          requiredMinutes,
          status: weekly >= requiredMinutes ? 'acceptable' : 'below',
        };
      });

      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setEntries(rows);
      setLoading(false);
    };
    fetch();
  }, [managerName, requiredMinutes]);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading activity...</div>;

  const bottomThree = entries.filter(e => e.status === 'below').slice(-3).map(e => e.user_id);

  return (
    <div>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Time</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">This Week</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : entries.map((e) => {
          const isBottom = bottomThree.includes(e.user_id);
          return (
            <div
              key={e.user_id}
              className={cn(
                "grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 items-center transition-colors",
                isBottom ? "bg-destructive/5 border-l-2 border-l-destructive/50" : "hover:bg-muted/20"
              )}
            >
              <span className="text-sm font-medium text-foreground truncate">{e.full_name}</span>
              <span className="text-xs font-bold tabular-nums text-foreground">{formatTime(e.totalMinutes)}</span>
              <span className={cn("text-xs font-bold tabular-nums", e.status === 'acceptable' ? "text-success" : "text-destructive")}>{formatTime(e.weeklyMinutes)}</span>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                e.status === 'acceptable' ? "text-success" : "text-destructive"
              )}>
                {e.status === 'acceptable' ? 'Acceptable' : 'Below Standard'}
                {isBottom && <AlertTriangle className="w-3 h-3 inline ml-1" />}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/app/leaderboard')}
        className="mt-4 w-full py-2.5 text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/15 transition-colors flex items-center justify-center gap-2"
      >
        View Team Leaderboard <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
