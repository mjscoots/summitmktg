import { useState } from 'react';
import { ChevronRight, ChevronDown, User, Crown, AlertTriangle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ActivityIndicator } from '@/components/shared/ActivityIndicator';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { getStatusInfo, getDisplayName } from '@/lib/hierarchyUtils';
import type { MemberTrainingProgress } from '@/hooks/useTrainingProgress';
import { getTeamColor } from '@/lib/teamColors';

interface TeamTreeNodeProps {
  member: TeamMember;
  isManager: boolean;
  isRoot?: boolean;
  depth?: number;
  getProgress?: (userId: string) => MemberTrainingProgress;
  onMemberClick?: (member: TeamMember) => void;
  teamName?: string | null;
}

export function TeamTreeNode({ 
  member, 
  isManager, 
  isRoot = false, 
  depth = 0, 
  getProgress,
  onMemberClick,
  teamName,
}: TeamTreeNodeProps) {
  const [expanded, setExpanded] = useState(isRoot || depth < 2);
  const hasChildren = member.children && member.children.length > 0;
  const statusInfo = getStatusInfo(member.status);
  const isNLC = member.status === 'nlc' || member.isNLC;
  const tc = getTeamColor(teamName);

  // Sort children: managers first by team size, then by training progress
  const sortedChildren = member.children?.slice().sort((a, b) => {
    const aIsManager = a.children && a.children.length > 0;
    const bIsManager = b.children && b.children.length > 0;
    
    // Managers first
    if (aIsManager && !bIsManager) return -1;
    if (!aIsManager && bIsManager) return 1;
    
    // Among managers, sort by team size
    if (aIsManager && bIsManager) {
      const aSize = a.children!.length;
      const bSize = b.children!.length;
      if (bSize !== aSize) return bSize - aSize;
    }
    
    // Among non-managers (or equal team size), sort by training progress
    if (getProgress) {
      const aProgress = getProgress(a.user_id).percentage;
      const bProgress = getProgress(b.user_id).percentage;
      if (bProgress !== aProgress) return bProgress - aProgress;
    }
    
    // Alphabetical tiebreaker
    return getDisplayName(a.full_name).localeCompare(getDisplayName(b.full_name));
  });

  const handleRowClick = (e: React.MouseEvent) => {
    // If clicking on expand/collapse area, toggle expansion
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMemberClick?.(member);
  };

  return (
    <div className={cn("relative", depth > 0 && "ml-6")}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-border/50" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-20px] top-5 w-5 h-px bg-border/50" />
      )}

      <div 
        className={cn(
          "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors",
          hasChildren && "cursor-pointer hover:bg-muted/30",
          isRoot && "bg-primary/10 border border-primary/20",
          isNLC && "opacity-50"
        )}
        onClick={handleRowClick}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          <button className="p-0.5 rounded hover:bg-muted/50">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Avatar with profile picture */}
        {isNLC ? (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (member as any).avatar_url ? (
          <UserAvatar 
            avatarUrl={(member as any).avatar_url} 
            fullName={member.full_name} 
            size="md" 
          />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isRoot 
              ? "bg-amber-500/20" 
              : tc.bgTint
          )}>
            {isRoot ? (
              <Crown className="w-4 h-4 text-amber-400" />
            ) : (
              <User className={cn("w-4 h-4", tc.text)} />
            )}
          </div>
        )}

        {/* Name and info - CLICKABLE */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleNameClick}
              className={cn(
                "font-medium truncate hover:underline cursor-pointer text-left",
                isNLC 
                  ? "text-muted-foreground" 
                  : tc.text
              )}
            >
              {getDisplayName(member.full_name)}
            </button>
            {member.dataIssue && (
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            )}
          </div>
           <div className="flex items-center gap-2">
             <p className="text-xs text-muted-foreground truncate">{member.email}</p>
             {!isNLC && (member as any).last_active_at && (
               <ActivityIndicator 
                 lastActiveAt={(member as any).last_active_at}
                 isActiveNow={(member as any).is_active_now}
                 size="xs"
                 showText={false}
               />
             )}
           </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isNLC && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isManager ? cn(tc.bgBadge, tc.text) : cn(tc.bgBadge, tc.text)
            )}>
              {isManager ? 'Manager' : 'Rookie'}
            </span>
          )}
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusInfo.className)}>
            {statusInfo.label}
          </span>
        </div>

        {/* Child count */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {member.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-1">
          {sortedChildren!.map(child => (
            <TeamTreeNode
              key={child.id}
              member={child}
              isManager={child.children && child.children.length > 0}
              depth={depth + 1}
              getProgress={getProgress}
              onMemberClick={onMemberClick}
              teamName={teamName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
