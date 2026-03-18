import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { PillarTreeView } from '@/components/team/PillarTreeView';
import type { TeamMember, Pillar } from '@/lib/hierarchyUtils';
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

/* ── Teams Tab (Pillar Card Grid + Drill-down) ── */
function TeamsTab({ managerName }: { managerName: string }) {
  const { profile, role } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());
  const [profilesRaw, setProfilesRaw] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, teamsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const teams = teamsRes.data || [];
      const roles = rolesRes.data || [];

      setProfilesRaw(profiles);
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
      setLoading(false);
    };
    fetchData();
  }, []);

  const visibleMembers = useMemo(() => allMembers.filter(m => m.status !== 'nlc'), [allMembers]);

  const { enrichedRoster } = useMemo(() => {
    if (visibleMembers.length === 0 || pillars.length === 0) return { enrichedRoster: [] };
    return assignPillarsToRoster(visibleMembers, pillars);
  }, [visibleMembers, pillars]);

  // Build pillar data with counts and ranking
  const teamsWithRanking = useMemo(() => {
    const teamCounts = new Map<string, { managers: number; rookies: number }>();
    pillars.forEach(p => teamCounts.set(p.id, { managers: 0, rookies: 0 }));

    profilesRaw.forEach(p => {
      if (p.status === 'nlc' || !p.team_id) return;
      const counts = teamCounts.get(p.team_id);
      if (!counts) return;
      if (managerRoles.has(p.user_id)) counts.managers++;
      else counts.rookies++;
    });

    const teams = pillars.map(p => {
      const counts = teamCounts.get(p.id) || { managers: 0, rookies: 0 };
      const totalMembers = counts.managers + counts.rookies;
      const points = (counts.managers * 2) + counts.rookies;
      return { id: p.id, name: p.name, slug: p.slug, logo_url: (p as any).logo_url, totalMembers, managerCount: counts.managers, rookieCount: counts.rookies, points, rank: 0 };
    });

    teams.sort((a, b) => b.points - a.points);
    teams.forEach((t, i) => { t.rank = i + 1; });
    return teams;
  }, [pillars, profilesRaw, managerRoles]);

  // Build pillar data for tree view
  const pillarData: Pillar[] = useMemo(() => {
    return pillars.map(p => {
      const ownerName = PILLAR_OWNERS[p.slug];
      const owner = findPersonByName(enrichedRoster, ownerName);
      const members = enrichedRoster.filter(m => m.pillar === p.slug);
      const managerCount = members.filter(m => checkIsManager(enrichedRoster, m.full_name) || m.role === 'manager').length;
      return { id: p.id, name: p.name, slug: p.slug, leader_id: p.leader_id, owner, members, totalCount: members.length, rookieCount: members.length - managerCount, managerCount };
    });
  }, [pillars, enrichedRoster]);

  const selectedPillarData = useMemo(() => {
    if (!selectedPillar) return null;
    return pillarData.find(p => p.slug === selectedPillar) || null;
  }, [selectedPillar, pillarData]);

  const selectedTree = useMemo(() => {
    if (!selectedPillarData) return null;
    const ownerName = PILLAR_OWNERS[selectedPillarData.slug];
    return buildHierarchyTree(enrichedRoster, ownerName);
  }, [selectedPillarData, enrichedRoster]);

  if (loading) return <SummitLoader label="Loading team structure..." />;

  // Drill-down view
  if (selectedPillar && selectedPillarData) {
    return (
      <PillarTreeView
        pillar={selectedPillarData}
        tree={selectedTree}
        roster={enrichedRoster.filter(m => m.pillar === selectedPillar)}
        onBack={() => setSelectedPillar(null)}
        logoUrl={pillars.find(p => p.slug === selectedPillar)?.logo_url}
      />
    );
  }

  // Pillar card grid
  return (
    <div className="space-y-4">
      {teamsWithRanking.map((team) => {
        const tc = getTeamColor(team.name);
        return (
          <button
            key={team.id}
            onClick={() => setSelectedPillar(team.slug)}
            className="w-full flex items-center gap-4 px-4 py-4 bg-card rounded-xl border border-border/50 hover:border-primary/40 transition-all text-left group"
          >
            {/* Logo */}
            {team.logo_url ? (
              <div className="w-12 h-12 rounded-xl border border-border/30 overflow-hidden bg-muted/30 flex-shrink-0">
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", tc.bgTint)}>
                <span className={cn("text-lg font-bold", tc.text)}>{team.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">{team.name}</span>
                <span className="text-xs text-muted-foreground">{team.totalMembers} members</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{team.managerCount} managers</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">{team.rookieCount} rookies</span>
              </div>
            </div>

            <ChevronRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
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
  const [copied, setCopied] = useState(false);

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



  const inactiveRookies = members.filter(m => getDaysInactive(m.last_active_at) >= 3);

  const handleCopyInactive = () => {
    // Group by team
    const byTeam = new Map<string, typeof inactiveRookies>();
    for (const m of inactiveRookies) {
      const team = m.teamName || 'No Team';
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push(m);
    }
    // Sort teams alphabetically, names within each team alphabetically
    const sortedTeams = [...byTeam.entries()].sort(([a], [b]) => a.localeCompare(b));
    const lines: string[] = [`Inactive Rookies (3+ days) — ${new Date().toLocaleDateString()}`, ''];
    for (const [team, reps] of sortedTeams) {
      lines.push(team);
      for (const r of reps.sort((a, b) => a.full_name.localeCompare(b.full_name))) {
        const days = getDaysInactive(r.last_active_at);
        lines.push(`  • ${r.full_name} — ${days === 999 ? 'Never active' : `${days} days`}`);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Copy Inactive Button */}
      {inactiveRookies.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleCopyInactive}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
              copied
                ? "bg-success/10 border-success/30 text-success"
                : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : `Copy Inactive (${inactiveRookies.length})`}
          </button>
        </div>
      )}
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
