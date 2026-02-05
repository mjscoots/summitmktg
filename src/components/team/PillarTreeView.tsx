import { useState, useMemo } from 'react';
import { ArrowLeft, Users, AlertTriangle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeamTreeNode } from './TeamTreeNode';
import { MemberProfileModal } from './MemberProfileModal';
 import { TeamResources } from './TeamResources';
 import { TeamTimeStats } from './TeamTimeStats';
import type { Pillar, TeamMember } from '@/lib/hierarchyUtils';
import { isManager as checkIsManager, normalizeName, getDisplayName } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';

interface PillarTreeViewProps {
  pillar: Pillar;
  tree: TeamMember | null;
  roster: TeamMember[];
  onBack: () => void;
  logoUrl?: string | null;
}

export function PillarTreeView({ pillar, tree, roster, onBack, logoUrl }: PillarTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Get all user IDs for training progress
  const userIds = useMemo(() => roster.map(m => m.user_id), [roster]);
  const { getProgress } = useTrainingProgress(userIds);

  // Build pyramid summary
  const getPyramidLevels = () => {
    if (!tree) return [];
    
    const levels: { level: number; members: TeamMember[] }[] = [];
    
    const traverse = (node: TeamMember, level: number) => {
      if (!levels[level]) {
        levels[level] = { level, members: [] };
      }
      levels[level].members.push(node);
      
      if (node.children) {
        node.children.forEach(child => traverse(child, level + 1));
      }
    };
    
    traverse(tree, 0);
    return levels;
  };

  const pyramidLevels = getPyramidLevels();

  // Filter tree based on search
  const filterTree = (node: TeamMember, query: string): TeamMember | null => {
    if (!query) return node;
    
    const normalizedQuery = normalizeName(query);
    const matchesSelf = normalizeName(node.full_name).includes(normalizedQuery);
    
    const filteredChildren = node.children
      ?.map(child => filterTree(child, query))
      .filter((child): child is TeamMember => child !== null) || [];
    
    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }
    
    return null;
  };

  const displayTree = searchQuery && tree ? filterTree(tree, searchQuery) : tree;

  // Toggle level expansion
  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Handle member click for profile modal
  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
  };

  // Count NLC members
  const nlcCount = pillar.members.filter(m => m.status === 'nlc' || m.isNLC).length;
  const activeCount = pillar.totalCount - nlcCount;

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mt-4 pt-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">{pillar.name}</h2>
            <p className="text-sm text-muted-foreground">
              {activeCount} active members
              {nlcCount > 0 && (
                <span className="text-muted-foreground/60"> · {nlcCount} NLC</span>
              )}
            </p>
          </div>
          
          {/* Team Logo in top right */}
          {logoUrl ? (
            <div className="w-14 h-14 rounded-xl border border-border/50 overflow-hidden bg-muted/30 flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={`${pillar.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-muted-foreground">
                {pillar.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Team Structure Summary */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Team Structure</h3>
        <div className="space-y-2">
          {pyramidLevels.map((level, idx) => {
            const isExpanded = expandedLevels.has(idx);
            const levelManagers = level.members.filter(m => m.children && m.children.length > 0);
            const levelRookies = level.members.filter(m => !m.children || m.children.length === 0);
            const nlcInLevel = level.members.filter(m => m.status === 'nlc' || m.isNLC).length;
            
            return (
              <div key={idx} className="space-y-1">
                <button
                  onClick={() => toggleLevel(idx)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-4 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors",
                    idx === 0 && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {level.members.length} {level.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {levelManagers.length > 0 && (
                      <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                        {levelManagers.length} mgr
                      </span>
                    )}
                    {levelRookies.length > 0 && (
                      <span className="bg-success/15 text-success px-2 py-0.5 rounded-full">
                        {levelRookies.length} rookie
                      </span>
                    )}
                    {nlcInLevel > 0 && (
                      <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {nlcInLevel} NLC
                      </span>
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="ml-8 flex flex-wrap gap-2">
                    {level.members
                      .slice()
                      .sort((a, b) => {
                        // Managers first by team size, then alphabetical
                        const aIsManager = a.children && a.children.length > 0;
                        const bIsManager = b.children && b.children.length > 0;
                        if (aIsManager && !bIsManager) return -1;
                        if (!aIsManager && bIsManager) return 1;
                        if (aIsManager && bIsManager) {
                          const diff = b.children!.length - a.children!.length;
                          if (diff !== 0) return diff;
                        }
                        return getDisplayName(a.full_name).localeCompare(getDisplayName(b.full_name));
                      })
                      .map(member => {
                        const isNLC = member.status === 'nlc' || member.isNLC;
                        const isMgr = member.children && member.children.length > 0;
                        return (
                          <button 
                            key={member.id}
                            onClick={() => handleMemberClick(member)}
                            className={cn(
                              "text-xs px-2 py-1 rounded-full transition-colors cursor-pointer",
                              isNLC
                                ? "bg-muted text-muted-foreground opacity-50 hover:opacity-75"
                                : isMgr
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "bg-success/10 text-success hover:bg-success/20"
                            )}
                          >
                            <span>{getDisplayName(member.full_name)}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tree View */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Organization Tree</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/30" />
              <span className="text-muted-foreground">Manager</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success/30" />
              <span className="text-muted-foreground">Rookie</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-muted-foreground">NLC</span>
            </div>
          </div>
        </div>

        {displayTree ? (
          <TeamTreeNode
            member={displayTree}
            isManager={true}
            isRoot={true}
            getProgress={getProgress}
            onMemberClick={handleMemberClick}
          />
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No members match your search' : 'Pillar owner not found in roster'}
            </p>
          </div>
        )}
      </div>

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        roster={roster}
        onMemberClick={handleMemberClick}
      />

      {/* Team Resources Section */}
      <TeamResources teamId={pillar.id} teamSlug={pillar.slug} />
 
       {/* Team Time Stats (Pillar view only) */}
       <TeamTimeStats teamId={pillar.id} teamName={pillar.name} />
    </div>
  );
}
