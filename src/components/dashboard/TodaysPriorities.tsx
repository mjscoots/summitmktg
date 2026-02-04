import { useNavigate } from 'react-router-dom';
import { Phone, Calendar, UserPlus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  urgent?: boolean;
}

const priorities: PriorityItem[] = [
  { id: '1', title: 'Reach out to 3 reps', icon: Phone, action: '/app/interviews' },
  { id: '2', title: '2 reps behind on training', icon: UserPlus, action: '/app/team', urgent: true },
  { id: '3', title: 'Book 2 interviews', icon: Calendar, action: '/app/interviews' },
];

export function TodaysPriorities() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30">
        <h2 className="font-semibold text-sm text-foreground">Today's Priorities</h2>
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
    </div>
  );
}