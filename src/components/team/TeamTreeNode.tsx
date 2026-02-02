import { useState } from 'react';
import { ChevronRight, ChevronDown, User, Crown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { getStatusInfo } from '@/lib/hierarchyUtils';

interface TeamTreeNodeProps {
  member: TeamMember;
  isManager: boolean;
  isRoot?: boolean;
  depth?: number;
}

export function TeamTreeNode({ member, isManager, isRoot = false, depth = 0 }: TeamTreeNodeProps) {
  const [expanded, setExpanded] = useState(isRoot || depth < 2);
  const hasChildren = member.children && member.children.length > 0;
  const statusInfo = getStatusInfo(member.status);

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
          isRoot && "bg-primary/10 border border-primary/20"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
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

        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isRoot ? "bg-amber-500/20" : isManager ? "bg-primary/20" : "bg-success/20"
        )}>
          {isRoot ? (
            <Crown className="w-4 h-4 text-amber-400" />
          ) : (
            <User className={cn("w-4 h-4", isManager ? "text-primary" : "text-success")} />
          )}
        </div>

        {/* Name and info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isManager ? "text-primary" : "text-success"
            )}>
              {member.full_name}
            </span>
            {member.dataIssue && (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isManager ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
          )}>
            {isManager ? 'Manager' : 'Rookie'}
          </span>
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
          {member.children!.map(child => (
            <TeamTreeNode
              key={child.id}
              member={child}
              isManager={child.children && child.children.length > 0}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
