import { ArrowLeft, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamTreeNode } from './TeamTreeNode';
import type { Pillar, TeamMember } from '@/lib/hierarchyUtils';
import { isManager as checkIsManager } from '@/lib/hierarchyUtils';

interface PillarTreeViewProps {
  pillar: Pillar;
  tree: TeamMember | null;
  roster: TeamMember[];
  onBack: () => void;
}

export function PillarTreeView({ pillar, tree, roster, onBack }: PillarTreeViewProps) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{pillar.name}</h2>
          <p className="text-sm text-muted-foreground">
            {pillar.totalCount} total members
          </p>
        </div>
      </div>

      {/* Pyramid Summary */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Pyramid Overview</h3>
        <div className="flex flex-col items-center gap-2">
          {pyramidLevels.slice(0, 4).map((level, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-muted/30 rounded-lg"
              style={{ width: `${Math.min(100, 40 + idx * 20)}%` }}
            >
              <span className="text-xs text-muted-foreground">Level {idx + 1}:</span>
              <span className="text-sm font-medium text-foreground">
                {level.members.length === 1 
                  ? level.members[0].full_name 
                  : `${level.members.length} members`}
              </span>
            </div>
          ))}
          {pyramidLevels.length > 4 && (
            <div className="text-xs text-muted-foreground">
              +{pyramidLevels.length - 4} more levels
            </div>
          )}
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
          </div>
        </div>

        {tree ? (
          <TeamTreeNode
            member={tree}
            isManager={true}
            isRoot={true}
          />
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-muted-foreground">
              Pillar owner not found in roster
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
