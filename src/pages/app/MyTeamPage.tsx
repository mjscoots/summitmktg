import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, AlertTriangle, UserPlus, Clock, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamCard } from '@/components/team/TeamCard';
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
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<TeamMember | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profiles with time/activity data for members view
  const [profilesRaw, setProfilesRaw] = useState<any[]>([]);

  const isAdmin = role === 'admin';
  const isManagerRole = role === 'manager' || role === 'admin';

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

      const members: TeamMember[] = (profiles || []).map(p => ({
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
      }));

      setAllMembers(members);
      setPillars(teamsData || []);
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

  // Build pillar data with counts and ranking - ONLY count ACTIVE members for points
  const teamsWithRanking: TeamWithRanking[] = useMemo(() => {
    const teams = pillars.map(p => {
      // Get all members for this pillar (for display when NLC toggle is on)
      const allMembers = enrichedRoster.filter(m => m.pillar === p.slug);
      
      // Filter to ACTIVE members only for point calculation (exclude NLC)
      const activeMembers = allMembers.filter(m => m.status !== 'nlc');
      
      const managerCount = activeMembers.filter(m => 
        isManager(enrichedRoster, m.full_name) || m.role === 'manager'
      ).length;
      const rookieCount = activeMembers.length - managerCount;
      
      // Points: managers = 2, rookies = 1 (NLC = 0, excluded above)
      const points = (managerCount * 2) + (rookieCount * 1);
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        logo_url: p.logo_url,
        totalMembers: activeMembers.length, // Only show active count on cards
        managerCount,
        rookieCount,
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
  }, [pillars, enrichedRoster]);

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

  // Total active members (NLC excluded)
  const totalActiveMembers = enrichedRoster.length;

  // Calculate total team time this week
  const totalTeamTimeMinutes = teamsWithRanking.reduce((sum, t) => sum, 0);

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
  const flatMembers = useMemo(() => {
    let members = profilesRaw.filter(p => p.status !== 'nlc');
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
  }, [profilesRaw, memberSearch, managerRoles, getProgress]);

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

        {/* ===== TEAMS VIEW ===== */}
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
                roster={enrichedRoster}
                onBack={() => setSelectedPillar(null)}
                logoUrl={pillars.find(p => p.slug === selectedPillar)?.logo_url}
                onDataChange={() => fetchData()}
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTeams.map((team, index) => (
                  <div
                    key={team.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TeamCard
                      team={team}
                      onClick={() => setSelectedPillar(team.slug)}
                      canUploadLogo={isManagerRole}
                      isAdmin={isAdmin}
                      onLogoUpdate={fetchData}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== MEMBERS VIEW ===== */}
        {viewMode === 'members' && (
          <>
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search by name or email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-muted/30 border border-border/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>

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
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Training</span>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time This Week</span>
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
                            <span className="text-foreground text-xs font-medium tabular-nums">
                              {formatTime(member.time_this_week_minutes)}
                            </span>
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
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
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