import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamMember } from '@/lib/hierarchyUtils';

interface DataIssuesPanelProps {
  issues: { person: TeamMember; issue: string }[];
  onClose: () => void;
}

export function DataIssuesPanel({ issues, onClose }: DataIssuesPanelProps) {
  if (issues.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-amber-400">Data Issues ({issues.length})</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {issues.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 text-sm py-2 border-b border-amber-500/20 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{item.person.full_name}</p>
              <p className="text-amber-400/80 text-xs">{item.issue}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
