import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { supabase } from '@/integrations/supabase/client';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';
import { BarChart3, Activity, Users, Clock, AlertTriangle, GraduationCap, ClipboardCheck, MessageSquare, ArrowUp, ArrowDown, Network, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon, Search, UserPlus, MoreHorizontal, Pencil, UserX, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { getTeamColor } from '@/lib/teamColors';
import { MiniWeekChart } from '@/components/team/MiniWeekChart';
import { Input } from '@/components/ui/input';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { getDisplayName, getEffectiveManager, PILLAR_OWNERS, assignPillarsToRoster, buildTree as buildHierarchyTree, isManager as checkIsManager, findPersonByName, normalizeName } from '@/lib/hierarchyUtils';

type WarRoomTab = 'downline' | 'teams' | 'pulse' | 'activity';

interface TeamMemberRow {
  user_id: string;
  full_name: string;
  last_active_at: string | null;
  trainingPct: number;
  checklistDone: boolean;
  teamName: string | null;
  pillarSlug: string | null;
}

interface TimeEntry {
  user_id: string;
  full_name: string;
  totalMinutes: number;
  weeklyMinutes: number;
  requiredMinutes: number;
  status: 'acceptable' | 'below';
  teamName: string | null;
}

/** Get Monday-based week start */
function getMondayWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getDaysInactive(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 999;
  const now = new Date();
  const active = new Date(lastActiveAt);
  return Math.floor((now.getTime() - active.getTime()) / 86400000);
}

export default function WarRoomPage() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Manager';
  const [activeTab, setActiveTab] = useState<WarRoomTab>('downline');

  const TABS: { id: WarRoomTab; label: string; icon: typeof Activity }[] = [
    { id: 'downline', label: 'Downline', icon: Users },
    { id: 'teams', label: 'Teams', icon: Network },
    { id: 'pulse', label: 'Pulse', icon: Activity },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <PageBackButton to="/app/analytics" label="Analytics" />

          {/* Hero */}
          <div className="relative h-24 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-red-900/60 to-orange-900/40" />
            <div className="absolute inset-0 flex items-center px-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                  <BarChart3 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">STATS</h1>
                  <p className="text-xs text-white/50">Your team's training, progress & accountability at a glance.</p>
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

          {activeTab === 'downline' && <DownlineTab managerName={profile?.full_name || ''} />}
          {activeTab === 'teams' && <TeamsTab managerName={profile?.full_name || ''} />}
          {activeTab === 'pulse' && <PulseTab managerName={profile?.full_name || ''} />}
          {activeTab === 'activity' && <ActivityTab managerName={profile?.full_name || ''} />}
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Teams Tab (Full Org Tree) ── */
function TeamsTab({ managerName }: { managerName: string }) {
  const { profile, role } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());
  const [dailyTimeMap, setDailyTimeMap] = useState<Map<string, { days: { minutes: number }[]; totalMinutes: number }>>(new Map());

  const memberUserIds = useMemo(() => allMembers.map(m => m.user_id), [allMembers]);
  const { getProgress } = useTrainingProgress(memberUserIds);

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, teamsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('teams').select('id, name, slug, leader_id').order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const teams = teamsRes.data || [];
      const roles = rolesRes.data || [];

      const managerIds = new Set(roles.filter(r => r.role === 'manager' || r.role === 'admin').map(r => r.user_id));
      setManagerRoles(managerIds);

      const members: TeamMember[] = profiles.map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        experience: p.experience,
        direct_manager: getEffectiveManager(p.direct_manager),
        role: managerIds.has(p.user_id) ? 'manager' : 'rookie',
        isNLC: p.status === 'nlc',
        last_active_at: p.last_active_at,
        is_active_now: p.is_active_now,
        avatar_url: p.avatar_url,
        team_id: p.team_id,
      }));

      setAllMembers(members);
      setPillars(teams);

      // Fetch daily time
      try {
        const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const day = pstNow.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(pstNow);
        monday.setDate(pstNow.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const { data: dailyData } = await supabase.from('daily_training_time').select('user_id, date, total_minutes').gte('date', fmt(monday)).lte('date', fmt(sunday)) as any;
        if (dailyData) {
          const byUser = new Map<string, any[]>();
          (dailyData as any[]).forEach((r: any) => { if (!byUser.has(r.user_id)) byUser.set(r.user_id, []); byUser.get(r.user_id)!.push(r); });
          const map = new Map<string, { days: { minutes: number }[]; totalMinutes: number }>();
          byUser.forEach((userRows, userId) => {
            const days: { minutes: number }[] = [];
            let total = 0;
            for (let i = 0; i < 7; i++) {
              const d = new Date(monday);
              d.setDate(monday.getDate() + i);
              const dateStr = fmt(d);
              const match = userRows.find((r: any) => r.date === dateStr);
              const mins = match?.total_minutes ?? 0;
              days.push({ minutes: mins });
              total += mins;
            }
            map.set(userId, { days, totalMinutes: total });
          });
          setDailyTimeMap(map);
        }
      } catch {}

      setLoading(false);
    };
    fetchData();
  }, []);

  const visibleMembers = useMemo(() => allMembers.filter(m => m.status !== 'nlc'), [allMembers]);
  const { enrichedRoster } = useMemo(() => {
    if (visibleMembers.length === 0 || pillars.length === 0) return { enrichedRoster: [] };
    return assignPillarsToRoster(visibleMembers, pillars);
  }, [visibleMembers, pillars]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const expandAll = () => setExpandedNodes(new Set(allMembers.map(m => m.id)));
  const collapseAll = () => setExpandedNodes(new Set());

  const renderTreeNode = (node: TeamMember, roster: TeamMember[], depth: number = 0) => {
    const children = roster.filter(m => m.direct_manager && normalizeName(m.direct_manager) === normalizeName(node.full_name));
    const hasChildren = children.length > 0;
    const isVeteran = node.role === 'manager' || node.role === 'admin' || node.experience === 'veteran';
    const isExpanded = searchQuery.length > 0 || expandedNodes.has(node.id);

    if (searchQuery && !node.full_name.toLowerCase().includes(searchQuery.toLowerCase()) && !children.some(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn("flex items-center gap-2 py-2 px-3 rounded-lg transition-colors group hover:bg-muted/50", depth === 0 && "bg-muted/30")}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="w-5 h-5 flex items-center justify-center cursor-pointer" onClick={() => hasChildren && toggleNode(node.id)}>
            {hasChildren ? (isExpanded ? <ChevronDownIcon className="w-4 h-4 text-muted-foreground" /> : <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />) : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
          </div>
          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", isVeteran ? "bg-primary" : "bg-green-500")} />
          <button onClick={() => setSelectedMember(node)} className={cn("font-medium text-sm hover:underline text-left", isVeteran ? "text-primary" : "text-green-400")}>
            {getDisplayName(node.full_name)}
          </button>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide", isVeteran ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400")}>
            {isVeteran ? 'Manager' : 'Rookie'}
          </span>
          {(() => {
            const weekData = dailyTimeMap.get(node.user_id);
            const defaultDays = Array(7).fill({ minutes: 0 });
            return <MiniWeekChart days={weekData?.days ?? defaultDays} totalMinutes={weekData?.totalMinutes ?? 0} className="ml-1" />;
          })()}
          <div className="flex-1" />
          {hasChildren && <span className="text-xs text-muted-foreground mr-2">{children.length} {children.length === 1 ? 'report' : 'reports'}</span>}
        </div>
        {isExpanded && hasChildren && (
          <div className="border-l border-border/30 ml-5">
            {children.map(child => renderTreeNode(child, roster, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <SummitLoader label="Loading team structure..." />;

  // Count members per team
  const teamCounts = new Map<string, number>();
  pillars.forEach(p => teamCounts.set(p.id, 0));
  allMembers.filter(m => m.status !== 'nlc').forEach(m => { if (m.team_id) teamCounts.set(m.team_id, (teamCounts.get(m.team_id) || 0) + 1); });

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search team members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">Expand All</button>
          <button onClick={collapseAll} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">Collapse All</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-muted-foreground">Manager / Veteran</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-muted-foreground">Rookie</span></div>
      </div>

      {/* Pillar Trees */}
      <div className="space-y-4">
        {pillars.map(pillar => {
          const ownerName = PILLAR_OWNERS[pillar.slug];
          const owner = enrichedRoster.find(m => normalizeName(m.full_name) === normalizeName(ownerName));
          const tree = owner ? buildHierarchyTree(enrichedRoster, ownerName) : null;
          const count = teamCounts.get(pillar.id) || 0;

          return (
            <div key={pillar.id} className="bg-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{pillar.name}</h3>
                  {ownerName && <p className="text-xs text-muted-foreground">Led by {getDisplayName(ownerName)}</p>}
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">{count} members</span>
              </div>
              {tree ? (
                <div className="space-y-1">{renderTreeNode(tree, enrichedRoster)}</div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{searchQuery ? 'No members match your search' : 'Leader not found'}</p>
              )}
            </div>
          );
        })}
      </div>

      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        roster={allMembers}
        pillars={pillars}
      />
    </>
  );
}

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

      const items = await getReachableRookieTrainingItems();
      const completedCounts = await getCompletedTrainingCounts(repIds, items);
      let avgTraining = 0;
      if (items.totalCount > 0) {
        let total = 0;
        repIds.forEach((uid: string) => { total += Math.round(((completedCounts.get(uid) || 0) / items.totalCount) * 100); });
        avgTraining = Math.round(total / repIds.length);
      }

      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const completedChecklist = (bp || []).filter((b: any) => b.bootcamp_completed).length;
      const checklistPct = repIds.length > 0 ? Math.round((completedChecklist / repIds.length) * 100) : 0;

      const weekStart = getMondayWeekStart();
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

  if (loading) return <SummitLoader label="Loading pulse..." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card rounded-xl border border-border/50 p-5 text-center">
          <m.icon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className={cn("text-3xl font-black tabular-nums", m.color)}>{m.value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Downline Tab (formerly Team) ── */
function DownlineTab({ managerName }: { managerName: string }) {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<'name' | 'training' | 'checklist' | 'activity'>('training');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!managerName) return;
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: managerName });
      const reps = (downline || []).filter((m: any) => m.role !== 'manager' && m.role !== 'admin');
      const repIds = reps.map((r: any) => r.user_id);
      if (repIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, last_active_at, team_id, pillar_slug').in('user_id', repIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get team names
      const teamIds = [...new Set((profiles || []).map(p => p.team_id).filter(Boolean))] as string[];
      const { data: teamsData } = teamIds.length > 0 
        ? await supabase.from('teams').select('id, name').in('id', teamIds)
        : { data: [] };
      const teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));

      const items = await getReachableRookieTrainingItems();
      const completedCounts = await getCompletedTrainingCounts(repIds, items);

      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const checkMap = new Map((bp || []).map(b => [b.user_id, b.bootcamp_completed]));

      const rows: TeamMemberRow[] = repIds.map((uid: string) => {
        const p = profileMap.get(uid);
        return {
          user_id: uid,
          full_name: p?.full_name || 'Unknown',
          last_active_at: p?.last_active_at || null,
          trainingPct: items.totalCount > 0 ? Math.round(((completedCounts.get(uid) || 0) / items.totalCount) * 100) : 0,
          checklistDone: checkMap.get(uid) || false,
          teamName: p?.team_id ? teamMap.get(p.team_id) || null : null,
          pillarSlug: p?.pillar_slug || null,
        };
      });

      setMembers(rows);
      setLoading(false);
    };
    fetch();
  }, [managerName]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...members].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
    else if (sortKey === 'training') cmp = b.trainingPct - a.trainingPct;
    else if (sortKey === 'checklist') cmp = (b.checklistDone ? 1 : 0) - (a.checklistDone ? 1 : 0);
    else if (sortKey === 'activity') cmp = (new Date(b.last_active_at || 0).getTime()) - (new Date(a.last_active_at || 0).getTime());
    return sortAsc ? -cmp : cmp;
  });

  const headers: { key: typeof sortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'training', label: 'Training %' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'activity', label: 'Last Active' },
  ];

  if (loading) return <SummitLoader label="Loading downline..." />;

  const toTeamMember = (row: TeamMemberRow): TeamMember => ({
    id: row.user_id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: '',
    status: null,
    experience: null,
    direct_manager: null,
    last_active_at: row.last_active_at,
  });

  return (
    <>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30">
          {headers.map(h => (
            <button
              key={h.key}
              onClick={() => handleSort(h.key)}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider text-left transition-colors flex items-center gap-1",
                sortKey === h.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.label}
              {sortKey === h.key && (
                sortAsc ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />
              )}
            </button>
          ))}
        </div>
        {/* Rows */}
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reps found</p>
        ) : sorted.map((m) => {
          const daysInactive = getDaysInactive(m.last_active_at);
          const isInactive3Plus = daysInactive >= 3;
          const teamColor = getTeamColor(m.teamName);
          return (
            <div key={m.user_id} className={cn(
              "grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 hover:bg-muted/20 transition-colors items-center",
              isInactive3Plus && "bg-destructive/5 border-l-2 border-l-destructive/40"
            )}>
              <button onClick={() => setSelectedMember(toTeamMember(m))} className={cn("text-sm font-bold hover:underline truncate text-left", teamColor.text)}>
                {m.full_name}
              </button>
              <div className="flex items-center gap-2">
                <Progress value={m.trainingPct} className="h-1.5 flex-1 bg-muted max-w-[80px]" />
                <span className={cn("text-xs font-bold tabular-nums", m.trainingPct >= 75 ? "text-success" : m.trainingPct >= 50 ? "text-yellow-400" : "text-destructive")}>{m.trainingPct}%</span>
              </div>
              <span className={cn("text-xs font-semibold", m.checklistDone ? "text-success" : "text-destructive")}>{m.checklistDone ? '✓ Done' : '✗ Incomplete'}</span>
              <span className={cn("text-[11px]", isInactive3Plus ? "text-destructive font-semibold" : "text-muted-foreground")}>
                {m.last_active_at ? (() => {
                  const now = new Date();
                  const active = new Date(m.last_active_at!);
                  const diffMs = now.getTime() - active.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 10) return 'Active Now';
                  if (daysInactive === 0) return 'Today';
                  if (daysInactive === 1) return 'Yesterday';
                  return `${daysInactive} days ago`;
                })() : 'Never'}
                {isInactive3Plus && <AlertTriangle className="w-3 h-3 inline ml-1 text-destructive" />}
              </span>
            </div>
          );
        })}
      </div>

      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        roster={[]}
      />
    </>
  );
}

/* ── Activity Tab ── */
function ActivityTab({ managerName }: { managerName: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredMinutes, setRequiredMinutes] = useState(120);
  const [sortKey, setSortKey] = useState<'name' | 'total' | 'weekly' | 'status'>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!managerName) return;
      const { data: downline } = await supabase.rpc('get_user_downline', { _manager_name: managerName });
      const reps = (downline || []).filter((m: any) => m.role !== 'manager' && m.role !== 'admin');
      const repIds = reps.map((r: any) => r.user_id);
      if (repIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, team_id').in('user_id', repIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      
      // Get team names
      const teamIds = [...new Set((profiles || []).map(p => p.team_id).filter(Boolean))] as string[];
      const { data: teamsData } = teamIds.length > 0 
        ? await supabase.from('teams').select('id, name').in('id', teamIds)
        : { data: [] };
      const teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));
      const profileTeamMap = new Map((profiles || []).map(p => [p.user_id, p.team_id ? teamMap.get(p.team_id) || null : null]));

      const weekStart = getMondayWeekStart();
      const { data: timeData } = await supabase
        .from('daily_training_time')
        .select('user_id, total_minutes, date')
        .in('user_id', repIds);

      const totalMap = new Map<string, number>();
      const weeklyMap = new Map<string, number>();
      (timeData || []).forEach(t => {
        totalMap.set(t.user_id, (totalMap.get(t.user_id) || 0) + t.total_minutes);
        if (new Date(t.date + 'T00:00:00') >= weekStart) {
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
          teamName: profileTeamMap.get(uid) || null,
        };
      });

      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setEntries(rows);
      setLoading(false);
    };
    fetch();
  }, [managerName, requiredMinutes]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
    else if (sortKey === 'total') cmp = b.totalMinutes - a.totalMinutes;
    else if (sortKey === 'weekly') cmp = b.weeklyMinutes - a.weeklyMinutes;
    else if (sortKey === 'status') cmp = (a.status === 'below' ? 1 : 0) - (b.status === 'below' ? 1 : 0);
    return sortAsc ? -cmp : cmp;
  });

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const toTeamMember = (row: TimeEntry): TeamMember => ({
    id: row.user_id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: '',
    status: null,
    experience: null,
    direct_manager: null,
  });

  if (loading) return <SummitLoader label="Loading activity..." />;

  const bottomThree = sortedEntries.filter(e => e.status === 'below').slice(-3).map(e => e.user_id);

  const activityHeaders: { key: typeof sortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'total', label: 'Total Time' },
    { key: 'weekly', label: 'This Week' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30">
          {activityHeaders.map(h => (
            <button
              key={h.key}
              onClick={() => handleSort(h.key)}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider text-left transition-colors flex items-center gap-1",
                sortKey === h.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.label}
              {sortKey === h.key && (
                sortAsc ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />
              )}
            </button>
          ))}
        </div>
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : sortedEntries.map((e) => {
          const isBottom = bottomThree.includes(e.user_id);
          const teamColor = getTeamColor(e.teamName);
          return (
            <div
              key={e.user_id}
              className={cn(
                "grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 items-center transition-colors",
                isBottom ? "bg-destructive/5 border-l-2 border-l-destructive/50" : "hover:bg-muted/20"
              )}
            >
              <button onClick={() => setSelectedMember(toTeamMember(e))} className={cn("text-sm font-bold hover:underline truncate text-left", teamColor.text)}>
                {e.full_name}
              </button>
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
        className="mt-4 w-full text-center text-xs font-semibold text-primary/70 hover:text-primary py-2 transition-colors"
      >
        View Full Leaderboard →
      </button>

      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        roster={[]}
      />
    </div>
  );
}
