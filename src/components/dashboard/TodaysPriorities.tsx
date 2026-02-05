import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamData } from '@/hooks/useTeamData';
import { Phone, Calendar, ChevronRight, AlertTriangle, Loader2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { UserAvatar } from '@/components/shared/UserAvatar';

interface PriorityItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  urgent?: boolean;
  count?: number;
}

export function TodaysPriorities() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const { needsAttention, members, teamName, isLoading } = useTeamData();

  const isManager = role === 'manager' || role === 'admin';

  if (!isManager) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-6 flex items-center justify-center min-h-[150px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate lowest performers - always show at least 3
  const activeMembers = members.filter(m => m.status === 'active');
  const lowestPerformers = [...activeMembers]
    .sort((a, b) => a.trainingProgress - b.trainingProgress)
    .slice(0, 3);
  
  const behindOnTraining = needsAttention.length;

  const priorities: PriorityItem[] = [
    { 
      id: '1', 
      title: `Check in with ${lowestPerformers.length} reps`, 
      icon: Phone, 
      action: '/app/team',
      count: lowestPerformers.length,
    },
  ];

  if (behindOnTraining > 0) {
    priorities.push({ 
      id: '2', 
      title: `${behindOnTraining} rep${behindOnTraining > 1 ? 's' : ''} behind on training`, 
      icon: AlertTriangle, 
      action: '/app/team', 
      urgent: true 
    });
  }

  priorities.push({ 
    id: '3', 
    title: 'Book 2 interviews', 
    icon: Calendar, 
    action: '/app/interviews' 
  });

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30">
        <h2 className="font-semibold text-sm text-foreground">
          Today's Priorities {teamName ? `- ${teamName}` : ''}
        </h2>
      </div>
      <div className="p-2 space-y-1">
        {priorities.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.action)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-md transition-all text-left group",
              "hover:bg-muted/50",
              item.urgent && "bg-destructive/5 border border-destructive/20"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-md",
              item.urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className={cn(
              "flex-1 text-sm font-medium",
              item.urgent ? "text-destructive" : "text-foreground"
            )}>
              {item.title}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>

      {/* Show lowest performing reps (always show if we have members) */}
      {lowestPerformers.length > 0 && (
        <div className="p-3 pt-0">
          <div className="text-xs text-muted-foreground mb-2">Lowest training progress:</div>
          <div className="space-y-1.5">
            {lowestPerformers.map(member => (
              <div 
                key={member.id}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
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
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  member.trainingProgress < 30 
                    ? "bg-destructive/10 text-destructive" 
                    : member.trainingProgress < 60 
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-success/10 text-success"
                )}>
                  {member.trainingProgress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
