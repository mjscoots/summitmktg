import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TeamNotificationBanners } from '@/components/team/TeamNotificationBanners';
import { TeamMember } from '@/lib/hierarchyUtils';

// Top-level team pillars with their leaders
const TEAM_PILLARS = [
  { name: 'Mafia', leader: 'Luke Chevalier' },
  { name: 'Quality Control', leader: 'Joshua Bingham' },
  { name: 'Altitude', leader: 'Cole Bundren' },
  { name: 'Atlas', leader: 'Sean Jablonski' },
  { name: 'Apex', leader: 'Hunter Shannon' },
  { name: 'Minions', leader: 'Colton Joyce' },
  { name: 'Paper Route', leader: 'Liam Gardner' },
];

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
}

interface TreeNode {
  member: TeamMemberLocal;
  children: TreeNode[];
  isExpanded: boolean;
}

// Convert local members to TeamMember format for modal
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
  const { role, isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMemberLocal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchAllMembers = async () => {
      try {
        // Fetch all profiles with their roles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .neq('status', 'nlc')
          .order('full_name');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        // Fetch roles for all users
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
        }

        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

        const membersWithRoles: TeamMember[] = (profiles || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          status: p.status,
          direct_manager: p.direct_manager,
          experience: p.experience,
          role: roleMap.get(p.user_id) || 'rookie',
        }));

        setAllMembers(membersWithRoles);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchAllMembers();
    }
  }, [authLoading]);

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
      
      return {
        member,
        children,
        isExpanded: expandedNodes.has(member.id),
      };
    };

    return buildNode(leaderMember);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(allMembers.map(m => m.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter members based on search
  const filterTree = (node: TreeNode | null, query: string): TreeNode | null => {
    if (!node) return null;
    
    const matchesSelf = node.member.full_name.toLowerCase().includes(query.toLowerCase());
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter((child): child is TreeNode => child !== null);
    
    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        isExpanded: query.length > 0 ? true : node.isExpanded,
      };
    }
    
    return null;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isVeteran = node.member.role === 'manager' || node.member.role === 'admin' || node.member.experience === 'veteran';
    const isExpanded = searchQuery.length > 0 || expandedNodes.has(node.member.id);
    
    return (
      <div key={node.member.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors cursor-pointer",
            "hover:bg-muted/50",
            depth === 0 ? "bg-muted/30" : ""
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => hasChildren && toggleNode(node.member.id)}
        >
          {/* Expand/Collapse indicator */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            )}
          </div>

          {/* Role indicator dot */}
          <div className={cn(
            "w-2.5 h-2.5 rounded-full flex-shrink-0",
            isVeteran ? "bg-primary" : "bg-green-500"
          )} />

          {/* Name */}
          <span className={cn(
            "font-medium text-sm",
            isVeteran ? "text-primary" : "text-green-400"
          )}>
            {node.member.full_name}
          </span>

          {/* Role badge */}
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
            isVeteran 
              ? "bg-primary/20 text-primary" 
              : "bg-green-500/20 text-green-400"
          )}>
            {isVeteran ? 'Manager' : 'Rookie'}
          </span>

          {/* Children count */}
          {hasChildren && (
            <span className="text-xs text-muted-foreground ml-auto">
              {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
            </span>
          )}
        </div>

        {/* Children */}
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

  // Non-managers shouldn't see this page
  if (!isManager) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </AppLayout>
    );
  }

  // Convert all members to TeamMember format for banners
  const rosterForBanners: TeamMember[] = allMembers.map(m => convertToTeamMember(m));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Team Notification Banners */}
        <TeamNotificationBanners 
          teamName="the team" 
          roster={rosterForBanners}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Teams
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Organizational hierarchy and team structure
          </p>
        </div>

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
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
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
            {TEAM_PILLARS.map(pillar => {
              let tree = buildTree(pillar.leader);
              
              // Apply search filter
              if (searchQuery && tree) {
                tree = filterTree(tree, searchQuery);
              }

              return (
                <div key={pillar.name} className="bg-card rounded-xl border border-border/50 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{pillar.name}</h3>
                      <p className="text-xs text-muted-foreground">Led by {pillar.leader}</p>
                    </div>
                  </div>
                  
                  {tree ? (
                    <div className="space-y-1">
                      {renderTreeNode(tree)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {searchQuery ? 'No members match your search' : `${pillar.leader} not found in system`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
