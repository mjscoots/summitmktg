import { useNavigate } from 'react-router-dom';
import { Users, TrendingDown, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeamSnapshot() {
  const navigate = useNavigate();
  
  // Mock data - would come from actual training progress queries
  const teamStats = {
    totalRookies: 12,
    completionRate: 68,
    topPerformers: ['Sarah M.', 'Jake T.', 'Lisa R.'],
    needsAttention: ['Mike D.', 'Chris P.'],
  };

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Team Snapshot</h2>
        </div>
        <button 
          onClick={() => navigate('/app/team')}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      </div>
      
      <div className="p-3 space-y-3">
        {/* Completion rate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Training Completion</span>
          <span className="text-lg font-bold text-foreground">{teamStats.completionRate}%</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${teamStats.completionRate}%` }}
          />
        </div>

        {/* Top performers */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <TrendingUp className="w-3 h-3 text-success" />
            <span>Top performers</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {teamStats.topPerformers.map((name) => (
              <span key={name} className="text-[11px] px-2 py-0.5 bg-success/10 text-success rounded-full">
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        {teamStats.needsAttention.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <TrendingDown className="w-3 h-3 text-destructive" />
              <span>Needs attention</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {teamStats.needsAttention.map((name) => (
                <button 
                  key={name} 
                  onClick={() => navigate('/app/team')}
                  className="text-[11px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}