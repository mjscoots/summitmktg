import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, ChevronRight, ChevronDown, Search, UserPlus, MoreHorizontal, Pencil, UserX, Trash2, Clock, TrendingUp, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TeamNotificationBanners } from '@/components/team/TeamNotificationBanners';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { AddMemberModal } from '@/components/team/AddMemberModal';
import { TeamMember, getDisplayName } from '@/lib/hierarchyUtils';

interface TeamPillar {
  name: string;
  leader: string;
  id: string;
}

interface TeamMemberLocal {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string | null;
  direct_manager: string | null;
  experience: string | null;
  role?: string;
  team_id?: string | null;
  time_this_week_minutes?: number | null;
  last_active_at?: string | null;
  is_active_now?: boolean | null;
}

interface TreeNode {
  member: TeamMemberLocal;
  children: TreeNode[];
  isExpanded: boolean;
}

const convertToTeamMember = (m: TeamMemberLocal): TeamMember => ({
  id: m.id,
  user_id: m.user_id,
  full_name: m.full_name,
  email: m.email,
  phone: m.phone,
  status: m.status,
  experience: m.experience,
  direct_manager: m.direct_manager,
  role: (m.role as 'rookie' | 'manager' | 'admin') || 'rookie',
});

export default function TeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMemberLocal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'nlc' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'teams' | 'members'>('teams');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [teamPillars, setTeamPillars] = useState<TeamPillar[]>([]);
  
  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // NLC confirm dialog
  const [nlcConfirm, setNlcConfirm] = useState<{ open: boolean; member: TeamMemberLocal | null }>({
    open: false, member: null
  });

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  // Training progress for all members
  const memberUserIds = useMemo(() => allMembers.map(m => m.user_id), [allMembers]);
  const { getProgress, getProgressColor } = useTrainingProgress(memberUserIds);

  // Get team name helper
  const getTeamName = useCallback((teamId: string | null | undefined) => {
    if (!teamId) return '—';
    return teams.find(t => t.id === teamId)?.name || '—';
  }, [teams]);

  // Format minutes to hours
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

  // Filtered members for Members view
  const filteredMembers = useMemo(() => {
    let members = allMembers.filter(m => m.status !== 'nlc');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      members = members.filter(m =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    // Sort: managers first (by team size desc), then rookies by training %
    return members.sort((a, b) => {
      const aIsManager = a.role === 'manager' || a.role === 'admin';
      const bIsManager = b.role === 'manager' || b.role === 'admin';
      if (aIsManager && !bIsManager) return -1;
      if (!aIsManager && bIsManager) return 1;
      if (!aIsManager && !bIsManager) {
        return getProgress(b.user_id).percentage - getProgress(a.user_id).percentage;
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [allMembers, searchQuery, getProgress]);

  const fetchAllMembers = useCallback(async () => {
    try {
      let query = supabase.from('profiles').select('*').order('full_name');
      
      if (statusFilter === 'active') {
        query = query.neq('status', 'nlc');
      } else if (statusFilter === 'nlc') {
        query = query.eq('status', 'nlc');
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) { console.error(profilesError); return; }

      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const membersWithRoles: TeamMemberLocal[] = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        direct_manager: p.direct_manager,
        experience: p.experience,
        role: roleMap.get(p.user_id) || 'rookie',
        team_id: p.team_id,
        time_this_week_minutes: p.time_this_week_minutes,
        last_active_at: p.last_active_at,
        is_active_now: p.is_active_now,
      }));

      setAllMembers(membersWithRoles);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const fetchTeams = useCallback(async () => {
    const { data } = await supabase.from('teams').select('id, name, slug, leader_id').order('name');
    setTeams(data || []);

    // Build dynamic team pillars from DB
    if (data && data.length > 0) {
      const leaderIds = data.filter(t => t.leader_id).map(t => t.leader_id!);
      let leaderMap = new Map<string, string>();
      if (leaderIds.length > 0) {
        const { data: leaders } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', leaderIds);
        leaders?.forEach(l => leaderMap.set(l.user_id, l.full_name));
      }
      const pillars: TeamPillar[] = data.map(t => ({
        id: t.id,
        name: t.name,
        leader: t.leader_id ? (leaderMap.get(t.leader_id) || 'Unknown') : 'Unassigned',
      }));
      setTeamPillars(pillars);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchAllMembers();
      fetchTeams();
    }
  }, [authLoading, fetchAllMembers, fetchTeams]);

  const handleMemberAdded = () => {
    setIsLoading(true);
    fetchAllMembers();
  };

  const handleMarkNLC = async (member: TeamMemberLocal) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'nlc', updated_at: new Date().toISOString() })
        .eq('user_id', member.user_id);

      if (error) throw error;
      toast.success(`${getDisplayName(member.full_name)} marked as NLC`);
      fetchAllMembers();
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
    }
  };

  const handleMemberClick = (member: TeamMemberLocal) => {
    setSelectedMember(convertToTeamMember(member));
    setProfileModalOpen(true);
  };

  // Build tree structure for a pillar
  const buildTree = (leader: string): TreeNode | null => {
    const leaderMember = allMembers.find(m =>
      m.full_name.toLowerCase() === leader.toLowerCase()
    );
    if (!leaderMember) return null;

    const buildNode = (member: TeamMemberLocal): TreeNode => {
      const children = allMembers
        .filter(m => m.direct_manager?.toLowerCase() === member.full_name.toLowerCase())
        .map(child => buildNode(child));
      return { member, children, isExpanded: expandedNodes.has(member.id) };
    };
    return buildNode(leaderMember);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedNodes(new Set(allMembers.map(m => m.id)));
  const collapseAll = () => setExpandedNodes(new Set());

  const filterTree = (node: TreeNode | null, query: string): TreeNode | null => {
    if (!node) return null;
    const matchesSelf = node.member.full_name.toLowerCase().includes(query.toLowerCase());
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter((c): c is TreeNode => c !== null);
    if (matchesSelf || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren, isExpanded: query.length > 0 ? true : node.isExpanded };
    }
    return null;
  };

  const getActiveCount = (leader: string): number => {
    const tree = buildTree(leader);
    if (!tree) return 0;
    const count = (node: TreeNode): number => 1 + node.children.reduce((sum, c) => sum + count(c), 0);
    return count(tree);
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isVeteran = node.member.role === 'manager' || node.member.role === 'admin' || node.member.experience === 'veteran';
    const isExpanded = searchQuery.length > 0 || expandedNodes.has(node.member.id);
    const isNLC = node.member.status === 'nlc';

    return (
      <div key={node.member.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors group",
            "hover:bg-muted/50",
            depth === 0 ? "bg-muted/30" : "",
            isNLC && "opacity-50"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse */}
          <div
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={() => hasChildren && toggleNode(node.member.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            )}
          </div>

          {/* Role dot */}
          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", isVeteran ? "bg-primary" : "bg-green-500")} />

          {/* Name - clickable */}
          <button
            onClick={() => handleMemberClick(node.member)}
            className={cn(
              "font-medium text-sm hover:underline text-left",
              isNLC ? "text-muted-foreground line-through" : isVeteran ? "text-primary" : "text-green-400"
            )}
          >
            {getDisplayName(node.member.full_name)}
          </button>

          {/* Role badge */}
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
            isVeteran ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400"
          )}>
            {isVeteran ? 'Manager' : 'Rookie'}
          </span>

          {/* Children count */}
          {hasChildren && (
            <span className="text-xs text-muted-foreground ml-auto mr-2">
              {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
            </span>
          )}

          {/* Action menu - show on hover */}
          {isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleMemberClick(node.member)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Member
                </DropdownMenuItem>
                {node.member.status !== 'nlc' && (
                  <DropdownMenuItem
                    onClick={() => setNlcConfirm({ open: true, member: node.member })}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserX className="w-3.5 h-3.5 mr-2" /> Mark as NLC
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="border-l border-border/30 ml-5">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </AppLayout>
    );
  }

  const rosterForBanners: TeamMember[] = allMembers.map(m => convertToTeamMember(m));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <TeamNotificationBanners teamName="the team" roster={rosterForBanners} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/15">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {viewMode === 'teams' ? 'Team Structure' : 'All Members'}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {viewMode === 'teams' ? 'Organizational hierarchy overview' : `${filteredMembers.length} active members`}
            </p>
          </div>
          {(isAdmin || teamPillars.some(p => p.leader === profile?.full_name)) && (
            <Button onClick={() => setAddModalOpen(true)} size="sm" className="gap-1.5 bg-transparent border border-border text-foreground hover:bg-white/5 font-semibold text-xs">
              <UserPlus className="w-3.5 h-3.5" /> Add Member
            </Button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-muted/30 rounded-lg w-fit border border-border/30">
          <button
            onClick={() => setViewMode('teams')}
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

        {/* ===== TEAMS VIEW ===== */}
        {viewMode === 'teams' && (
          <>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as any); setIsLoading(true); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="nlc">NLC Only</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <button onClick={expandAll} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  Expand All
                </button>
                <button onClick={collapseAll} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  Collapse All
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Manager / Veteran</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Rookie</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading team structure...</div>
              </div>
            ) : (
              <div className="space-y-6">
                {teamPillars.map(pillar => {
                  let tree = buildTree(pillar.leader);
                  if (searchQuery && tree) tree = filterTree(tree, searchQuery);
                  const count = getActiveCount(pillar.leader);

                  return (
                    <div key={pillar.id} className="bg-card rounded-xl border border-border/50 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{pillar.name}</h3>
                          <p className="text-xs text-muted-foreground">Led by {getDisplayName(pillar.leader)}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {count} members
                        </span>
                      </div>

                      {tree ? (
                        <div className="space-y-1">{renderTreeNode(tree)}</div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          {searchQuery ? 'No members match your search' : `${getDisplayName(pillar.leader)} not found in system`}
                        </p>
                      )}
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
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading members...</div>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden">
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
                    {filteredMembers.map(member => {
                      const progress = getProgress(member.user_id);
                      const isVeteran = member.role === 'manager' || member.role === 'admin';
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
                              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", isVeteran ? "bg-primary" : "bg-green-500")} />
                              <span className="font-medium text-foreground">{getDisplayName(member.full_name)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                              isVeteran ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400"
                            )}>
                              {member.role === 'admin' ? 'Admin' : isVeteran ? 'Manager' : 'Rookie'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{getTeamName(member.team_id)}</td>
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
                    {filteredMembers.length === 0 && (
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
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onMemberAdded={handleMemberAdded}
        teams={teams}
      />

      {/* Profile/Edit Modal */}
      <MemberProfileModal
        member={selectedMember}
        open={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedMember(null); }}
        roster={rosterForBanners}
        pillars={teams}
        onMemberClick={(m) => setSelectedMember(m)}
        onStatusChange={() => { setIsLoading(true); fetchAllMembers(); }}
      />

      {/* NLC Confirmation */}
      <AlertDialog open={nlcConfirm.open} onOpenChange={open => !open && setNlcConfirm({ open: false, member: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as NLC?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark {nlcConfirm.member ? getDisplayName(nlcConfirm.member.full_name) : ''} as NLC? They will be removed from all active team lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (nlcConfirm.member) handleMarkNLC(nlcConfirm.member);
                setNlcConfirm({ open: false, member: null });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
