import { AlertTriangle, X, UserPlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { 
  DEPRECATED_MANAGERS, 
  PILLAR_OWNERS, 
  findPersonByName,
  getEffectiveManager,
  namesMatch 
} from '@/lib/hierarchyUtils';

interface DataIssue {
  person: TeamMember;
  issue: string;
  type?: 'missing_manager' | 'deprecated_manager' | 'unresolved_chain' | 'missing_pillar_owner';
  suggestedFix?: string;
}

interface DataIssuesPanelProps {
  issues: DataIssue[];
  roster?: TeamMember[];
  onClose: () => void;
  onApplyFix?: (issue: DataIssue) => void;
}

export function DataIssuesPanel({ issues, roster = [], onClose, onApplyFix }: DataIssuesPanelProps) {
  // Categorize issues
  const categorizedIssues = issues.map(item => {
    const issue = item.issue.toLowerCase();
    
    // Check if it's a deprecated manager reference
    const managerName = item.person.direct_manager;
    if (managerName) {
      const normalized = managerName.toLowerCase().trim().replace(/\s+/g, ' ');
      const deprecated = DEPRECATED_MANAGERS[normalized];
      if (deprecated) {
        return {
          ...item,
          type: 'deprecated_manager' as const,
          suggestedFix: `Reassign to ${deprecated.rewriteTo}`,
        };
      }
    }
    
    if (issue.includes('manager') && issue.includes('not found')) {
      return {
        ...item,
        type: 'missing_manager' as const,
        suggestedFix: 'Find or create manager record',
      };
    }
    
    if (issue.includes('pillar owner')) {
      return {
        ...item,
        type: 'missing_pillar_owner' as const,
        suggestedFix: 'Add missing pillar owner to database',
      };
    }
    
    return {
      ...item,
      type: 'unresolved_chain' as const,
    };
  });

  // Group by issue type
  const deprecatedManagerIssues = categorizedIssues.filter(i => i.type === 'deprecated_manager');
  const missingManagerIssues = categorizedIssues.filter(i => i.type === 'missing_manager');
  const otherIssues = categorizedIssues.filter(i => i.type !== 'deprecated_manager' && i.type !== 'missing_manager');

  // Check for missing pillar owners
  const missingPillarOwners: string[] = [];
  for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
    const owner = findPersonByName(roster, ownerName);
    if (!owner) {
      missingPillarOwners.push(`${ownerName} (${slug})`);
    }
  }

  const totalIssues = issues.length + missingPillarOwners.length;

  if (totalIssues === 0) {
    return (
      <div className="bg-success/10 border border-success/30 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="font-medium text-success">All data issues resolved!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-primary">Data Issues ({totalIssues})</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {/* Missing Pillar Owners */}
        {missingPillarOwners.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Missing Pillar Owners ({missingPillarOwners.length})
            </h4>
            {missingPillarOwners.map((owner, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm py-2 px-3 bg-primary/5 rounded-lg">
                <span className="text-foreground">{owner}</span>
                <span className="text-primary/60 text-xs">needs to be added to database</span>
              </div>
            ))}
          </div>
        )}

        {/* Deprecated Manager References */}
        {deprecatedManagerIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              Deprecated Manager Refs ({deprecatedManagerIssues.length})
            </h4>
            {deprecatedManagerIssues.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm py-2 px-3 bg-primary/5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.person.full_name}</p>
                  <p className="text-primary/80 text-xs">
                    Manager "{item.person.direct_manager}" → {item.suggestedFix}
                  </p>
                </div>
              </div>
            ))}
            {deprecatedManagerIssues.length > 5 && (
              <p className="text-xs text-primary/60">
                +{deprecatedManagerIssues.length - 5} more with deprecated manager refs
              </p>
            )}
          </div>
        )}

        {/* Missing Manager Issues */}
        {missingManagerIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Manager Not Found ({missingManagerIssues.length})
            </h4>
            {missingManagerIssues.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm py-2 px-3 bg-primary/5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.person.full_name}</p>
                  <p className="text-primary/80 text-xs">{item.issue}</p>
                </div>
              </div>
            ))}
            {missingManagerIssues.length > 5 && (
              <p className="text-xs text-primary/60">
                +{missingManagerIssues.length - 5} more with missing managers
              </p>
            )}
          </div>
        )}

        {/* Other Issues */}
        {otherIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wide">
              Other Issues ({otherIssues.length})
            </h4>
            {otherIssues.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm py-2 border-b border-amber-500/20 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.person.full_name}</p>
                  <p className="text-primary/80 text-xs">{item.issue}</p>
                </div>
              </div>
            ))}
            {otherIssues.length > 3 && (
              <p className="text-xs text-primary/60">
                +{otherIssues.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
