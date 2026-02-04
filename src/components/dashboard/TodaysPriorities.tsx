import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamData } from '@/hooks/useTeamData';
import { Phone, Calendar, UserPlus, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Build priorities based on actual team data
  const behindOnTraining = needsAttention.length;
  const activeMembers = members.filter(m => m.status === 'active');

  const priorities: PriorityItem[] = [
    { 
      id: '1', 
      title: `Reach out to ${Math.min(3, activeMembers.length)} reps`, 
      icon: Phone, 
      action: '/app/interviews' 
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

      {/* Show specific reps who need attention */}
      {needsAttention.length > 0 && (
        <div className="p-3 pt-0">
          <div className="text-xs text-muted-foreground mb-2">Behind on training:</div>
          <div className="flex flex-wrap gap-1.5">
            {needsAttention.slice(0, 3).map(member => (
              <span 
                key={member.id}
                className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full"
              >
                {member.full_name.split(' ').slice(0, 2).join(' ')} ({member.trainingProgress}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
