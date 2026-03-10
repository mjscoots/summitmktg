import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, AlertTriangle, UserPlus, Clock, TrendingUp, Activity, ShieldCheck, X, ChevronDown, ChevronRight } from 'lucide-react';
import { MiniWeekChart } from '@/components/team/MiniWeekChart';
import { Button } from '@/components/ui/button';

import { PillarTreeView } from '@/components/team/PillarTreeView';
import { AddMemberModal } from '@/components/team/AddMemberModal';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { AnimatedEllipsis } from '@/components/team/AnimatedEllipsis';
import { useManagerNotifications } from '@/hooks/useManagerNotifications';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { formatTimeMinutes } from '@/hooks/useActivityTracking';
import {
  TeamMember,
  Pillar,
  PILLAR_OWNERS,
  normalizeName,
  findPersonByName,
  buildTree,
  isManager,
  assignPillarsToRoster,
  getEffectiveManager,
  getDisplayName,
} from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';

interface TeamWithRanking {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  totalMembers: number;
  managerCount: number;
  rookieCount: number;
  points: number;
  rank: number;
}

export default function MyTeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null; logo_url?: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'teams' | 'members'>('teams');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(() => {
    try { return sessionStorage.getItem('team-filter') || 'all'; } catch { return 'all'; }
  });
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<TeamMember | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profiles with time/activity data for members view
  const [profilesRaw, setProfilesRaw] = useState<any[]>([]);
  const [bootcampMap, setBootcampMap] = useState<Map<string, { completed: boolean; exempt: boolean; phases: number }>>(new Map());
  const [dailyTimeMap, setDailyTimeMap] = useState<Map<string, { days: { minutes: number }[]; totalMinutes: number }>>(new Map());

  const isAdmin = role === 'admin';
  const isManagerRole = role === 'manager' || role === 'admin' || role === 'owner';

  // Listen for manager notifications (real-time toasts)
  useManagerNotifications();

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;
      setProfilesRaw(profiles || []);

      // Fetch bootcamp progress
      const { data: bootcampData } = await supabase
        .from('bootcamp_progress')
        .select('user_id, bootcamp_completed, bootcamp_exempt, phase_1_complete, phase_2_complete, phase_3_complete');

      const bMap = new Map<string, { completed: boolean; exempt: boolean; phases: number }>();
      for (const b of bootcampData || []) {
        bMap.set(b.user_id, {
          completed: b.bootcamp_completed,
          exempt: b.bootcamp_exempt,
          phases: [b.phase_1_complete, b.phase_2_complete, b.phase_3_complete].filter(Boolean).length,
        });
      }
      setBootcampMap(bMap);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const managerUserIds = new Set(
        (rolesData || [])
          .filter(r => r.role === 'manager' || r.role === 'admin')
          .map(r => r.user_id)
      );
      setManagerRoles(managerUserIds);

      const members: TeamMember[] = (profiles || []).map(p => {
        const base: TeamMember = {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          status: p.status,
          experience: p.experience,
          direct_manager: getEffectiveManager(p.direct_manager),
          role: managerUserIds.has(p.user_id) ? 'manager' : 'rookie',
          isNLC: p.status === 'nlc',
        };
        base.last_active_at = p.last_active_at;
        base.is_active_now = p.is_active_now;
        base.avatar_url = p.avatar_url;
        base.time_this_week_minutes = p.time_this_week_minutes;
        base.team_id = p.team_id;
        return base;
      });

      setAllMembers(members);
      setPillars(teamsData || []);

      // Fetch daily training time for week chart
      try {
        const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const day = pstNow.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(pstNow);
        monday.setDate(pstNow.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const start = fmt(monday);
        const end = fmt(sunday);

        const { data: dailyData } = await (supabase
          .from('daily_training_time' as any)
          .select('user_id, date, total_minutes')
          .gte('date', start)
          .lte('date', end) as any);

        if (dailyData) {
          const byUser = new Map<string, any[]>();
          (dailyData as any[]).forEach((r: any) => {
            if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
            byUser.get(r.user_id)!.push(r);
          });

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
      } catch {
        // Silent fail for daily time
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  // Filter to active members only (exclude NLC)
  const visibleMembers = useMemo(() => {
    return allMembers.filter(m => m.status !== 'nlc');
  }, [allMembers]);

  // Assign pillars to all members
  const { enrichedRoster, dataIssues } = useMemo(() => {
    if (visibleMembers.length === 0 || pillars.length === 0) {
      return { enrichedRoster: [], dataIssues: [] };
    }
    return assignPillarsToRoster(visibleMembers, pillars);
  }, [visibleMembers, pillars]);

  // Build pillar data with counts and ranking - use team_id from DB as source of truth
  const teamsWithRanking: TeamWithRanking[] = useMemo(() => {
    // Count active members per team using DB team_id (source of truth)
    const teamCounts = new Map<string, { managers: number; rookies: number }>();
    pillars.forEach(p => teamCounts.set(p.id, { managers: 0, rookies: 0 }));

    profilesRaw.forEach(p => {
      if (p.status === 'nlc' || !p.team_id) return;
      const counts = teamCounts.get(p.team_id);
      if (!counts) return;
      if (managerRoles.has(p.user_id)) {
        counts.managers++;
      } else {
        counts.rookies++;
      }
    });

    const teams = pillars.map(p => {
      const counts = teamCounts.get(p.id) || { managers: 0, rookies: 0 };
      const totalMembers = counts.managers + counts.rookies;
      const points = (counts.managers * 2) + (counts.rookies * 1);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        logo_url: p.logo_url,
        totalMembers,
        managerCount: counts.managers,
        rookieCount: counts.rookies,
        points,
        rank: 0,
      };
    });

    // Sort by points descending and assign ranks
    teams.sort((a, b) => b.points - a.points);
    teams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return teams;
  }, [pillars, profilesRaw, managerRoles]);

  // Filter teams by search
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teamsWithRanking;
    const query = normalizeName(searchQuery);
    return teamsWithRanking.filter(t => 
      normalizeName(t.name).includes(query)
    );
  }, [teamsWithRanking, searchQuery]);

  // Build pillar data for tree view
  const pillarData: Pillar[] = useMemo(() => {
    return pillars.map(p => {
      const ownerName = PILLAR_OWNERS[p.slug];
      const owner = findPersonByName(enrichedRoster, ownerName);
      const members = enrichedRoster.filter(m => m.pillar === p.slug);
      const managerCount = members.filter(m => 
        isManager(enrichedRoster, m.full_name) || m.role === 'manager'
      ).length;
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        leader_id: p.leader_id,
        owner,
        members,
        totalCount: members.length,
        rookieCount: members.length - managerCount,
        managerCount,
      };
    });
  }, [pillars, enrichedRoster]);

  // Build tree for selected pillar
  const selectedPillarData = useMemo(() => {
    if (!selectedPillar) return null;
    return pillarData.find(p => p.slug === selectedPillar) || null;
  }, [selectedPillar, pillarData]);

  const selectedTree = useMemo(() => {
    if (!selectedPillarData) return null;
    const ownerName = PILLAR_OWNERS[selectedPillarData.slug];
    return buildTree(enrichedRoster, ownerName);
  }, [selectedPillarData, enrichedRoster]);

  // Total active members (NLC excluded) - use DB team_id source of truth
  const totalActiveMembers = profilesRaw.filter(p => p.status !== 'nlc').length;

  // Training progress for all members
  const memberUserIds = useMemo(() => allMembers.map(m => m.user_id), [allMembers]);
  const { getProgress, getProgressColor } = useTrainingProgress(memberUserIds);

  // Format minutes to readable time
  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // Relative time for last active
  const getLastActive = (lastActive: string | null | undefined, isActiveNow: boolean | null | undefined) => {
    if (isActiveNow) return 'Active now';
    if (!lastActive) return 'Never';
    const diff = Date.now() - new Date(lastActive).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Build flat sorted members list for Members view
  // Persist team filter to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('team-filter', selectedTeamFilter); } catch {}
  }, [selectedTeamFilter]);

  const flatMembers = useMemo(() => {
    let members = profilesRaw.filter(p => p.status !== 'nlc');
    // Team filter
    if (selectedTeamFilter !== 'all') {
      members = members.filter(m => m.team_id === selectedTeamFilter);
    }
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      members = members.filter(m =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    return members.sort((a: any, b: any) => {
      const aIsManager = managerRoles.has(a.user_id);
      const bIsManager = managerRoles.has(b.user_id);
      if (aIsManager && !bIsManager) return -1;
      if (!aIsManager && bIsManager) return 1;
      if (!aIsManager && !bIsManager) {
        return getProgress(b.user_id).percentage - getProgress(a.user_id).percentage;
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [profilesRaw, memberSearch, selectedTeamFilter, managerRoles, getProgress]);

  const handleMemberClick = useCallback((profile: any) => {
    const member: TeamMember = {
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      status: profile.status,
      experience: profile.experience,
      direct_manager: profile.direct_manager,
      role: managerRoles.has(profile.user_id) ? 'manager' : 'rookie',
    };
    setSelectedMemberProfile(member);
    setProfileModalOpen(true);
  }, [managerRoles]);

  const getTeamNameById = useCallback((teamId: string | null) => {
    if (!teamId) return '—';
    return pillars.find(p => p.id === teamId)?.name || '—';
  }, [pillars]);
 
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        {!selectedPillar && (
          <>
            <div className="mb-8">
              {/* Title Row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    Team Structure
                  </h1>
                  <p className="text-muted-foreground text-base mt-1">
                    Organizational hierarchy overview
                  </p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-2">
                  {/* Search Icon */}
                  {searchOpen ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() => !searchQuery && setSearchOpen(false)}
                        autoFocus
                        className="w-48 px-3 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}

                  {/* Add Member Button - Pillar/Admin only */}
                  {(isAdmin || pillars.some(p => p.leader_id === profile?.user_id)) && (
                    <Button
                      onClick={() => setAddMemberOpen(true)}
                      size="sm"
                      className="gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Member
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-xl font-bold text-foreground">{totalActiveMembers}</span>
                  <AnimatedEllipsis className="text-primary text-lg font-bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Managers:</span>
                  <span className="text-xl font-bold text-primary">{teamsWithRanking.reduce((sum, t) => sum + t.managerCount, 0)}</span>
                  <AnimatedEllipsis className="text-primary text-lg font-bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rookies:</span>
                  <span className="text-xl font-bold text-success">{teamsWithRanking.reduce((sum, t) => sum + t.rookieCount, 0)}</span>
                  <AnimatedEllipsis className="text-success text-lg font-bold" />
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg w-fit border border-border/30">
                <button
                  onClick={() => { setViewMode('teams'); setSelectedPillar(null); }}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'teams'
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Teams
                </button>
                <button
                  onClick={() => setViewMode('members')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'members'
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Members
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== TEAMS VIEW (Team Structure) ===== */}
        {viewMode === 'teams' && (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading team data...</div>
              </div>
            ) : selectedPillar && selectedPillarData ? (
              <PillarTreeView
                pillar={selectedPillarData}
                tree={selectedTree}
                roster={enrichedRoster.filter(m => m.pillar === selectedPillar)}
                onBack={() => setSelectedPillar(null)}
                logoUrl={pillars.find(p => p.slug === selectedPillar)?.logo_url}
                onDataChange={() => fetchData()}
              />
            ) : (
              <div className="space-y-4">
                {filteredTeams.map((team) => {
                  const pillar = pillarData.find(p => p.id === team.id);
                  if (!pillar) return null;
                  const ownerName = PILLAR_OWNERS[team.slug];
                  const tree = buildTree(enrichedRoster, ownerName);
                  return (
                    <div key={team.id} className="border border-border/30 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setSelectedPillar(team.slug)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          <span className="font-bold text-foreground">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.totalMembers} members
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== MEMBERS VIEW ===== */}
        {viewMode === 'members' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search by name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-muted/30 border border-border/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm bg-card border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer"
                  >
                    <option value="all">All Teams</option>
                    {pillars.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {selectedTeamFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedTeamFilter('all')}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                    title="Clear filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Showing <span className="font-semibold text-foreground">{flatMembers.length}</span> members
              {selectedTeamFilter !== 'all' && (
                <> from <span className="font-semibold text-foreground">{pillars.find(p => p.id === selectedTeamFilter)?.name}</span></>
              )}
            </p>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading members...</div>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Team</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Bootcamp</span>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Training</span>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Week Activity</span>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Last Active</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatMembers.map((member: any) => {
                      const progress = getProgress(member.user_id);
                      const isMgr = managerRoles.has(member.user_id);
                      const progressColor = progress.percentage >= 100 ? 'text-green-400' :
                        progress.percentage >= 71 ? 'text-primary' :
                        progress.percentage >= 41 ? 'text-yellow-500' : 'text-destructive';

                      return (
                        <tr
                          key={member.user_id}
                          onClick={() => handleMemberClick(member)}
                          className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", isMgr ? "bg-primary" : "bg-green-500")} />
                              <span className="font-medium text-foreground">{getDisplayName(member.full_name)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                              isMgr ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400"
                            )}>
                              {isMgr ? 'Manager' : 'Rookie'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{getTeamNameById(member.team_id)}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const bc = bootcampMap.get(member.user_id);
                              if (isMgr) return <span className="text-[10px] text-muted-foreground">N/A</span>;
                              if (!bc) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Not Started</span>;
                              if (bc.completed || bc.exempt) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ Done</span>;
                              return (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
                                  {bc.phases}/3
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all",
                                    progress.percentage >= 100 ? "bg-green-400" :
                                    progress.percentage >= 71 ? "bg-primary" :
                                    progress.percentage >= 41 ? "bg-yellow-500" : "bg-destructive"
                                  )}
                                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                                />
                              </div>
                              <span className={cn("text-xs font-semibold tabular-nums", progressColor)}>
                                {progress.percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const weekData = dailyTimeMap.get(member.user_id);
                              const defaultDays = Array(7).fill({ minutes: 0 });
                              return (
                                <MiniWeekChart
                                  days={weekData?.days ?? defaultDays}
                                  totalMinutes={weekData?.totalMinutes ?? 0}
                                />
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {member.is_active_now && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              )}
                              <span className={cn("text-xs", member.is_active_now ? "text-green-400 font-medium" : "text-muted-foreground")}>
                                {getLastActive(member.last_active_at, member.is_active_now)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {flatMembers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No members found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Add Member Modal */}
        <AddMemberModal
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          onMemberAdded={() => fetchData()}
          teams={pillars.map(p => ({ id: p.id, name: p.name, slug: p.slug }))}
        />

        {/* Member Profile Modal */}
        <MemberProfileModal
          member={selectedMemberProfile}
          open={profileModalOpen}
          onClose={() => { setProfileModalOpen(false); setSelectedMemberProfile(null); }}
          roster={allMembers}
          pillars={pillars.map(p => ({ id: p.id, name: p.name, slug: p.slug }))}
          onMemberClick={(m) => setSelectedMemberProfile(m)}
          onStatusChange={() => fetchData()}
        />
      </main>
    </AppLayout>
  );
}