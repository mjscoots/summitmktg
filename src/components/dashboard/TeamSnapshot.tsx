import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useTeamData } from '@/hooks/useTeamData';
import { Users, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { UserAvatar } from '@/components/shared/UserAvatar';

export function TeamSnapshot() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { teamName, topPerformers, needsAttention, completionRate, isLoading, error } = useTeamData();

  const isManager = isManagerOrAbove(role);

  // For rookies, show personal stats instead
  if (!isManager) {
    return <RookieProgress />;
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">
            {teamName || 'Team'} Snapshot
          </h2>
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
          <span className="text-lg font-bold text-foreground">{completionRate}%</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Top performers */}
        {topPerformers.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <TrendingUp className="w-3 h-3 text-success" />
              <span>Top performers</span>
            </div>
            <div className="space-y-1.5">
              {topPerformers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/app/team')}
                >
                  <UserAvatar 
                    avatarUrl={member.avatar_url} 
                    fullName={member.full_name} 
                    size="xs" 
                  />
                  <span className="text-xs text-foreground truncate flex-1">
                    {member.full_name.split(' ').slice(0, 2).join(' ')}
                  </span>
                  <span className="text-[10px] text-success font-medium">
                    {member.trainingProgress}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs attention */}
        {needsAttention.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <TrendingDown className="w-3 h-3 text-destructive" />
              <span>Needs attention</span>
            </div>
            <div className="space-y-1.5">
              {needsAttention.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/app/team')}
                >
                  <UserAvatar 
                    avatarUrl={member.avatar_url} 
                    fullName={member.full_name} 
                    size="xs" 
                  />
                  <span className="text-xs text-foreground truncate flex-1">
                    {member.full_name.split(' ').slice(0, 2).join(' ')}
                  </span>
                  <span className="text-[10px] text-destructive font-medium">
                    {member.trainingProgress}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Rookie personal progress component
function RookieProgress() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-foreground">Your Progress</h2>
        <button 
          onClick={() => navigate('/app/training')}
          className="text-xs text-success hover:underline"
        >
          Continue Training
        </button>
      </div>
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Keep training to build your skills and climb the leaderboard!
        </p>
      </div>
    </div>
  );
}
