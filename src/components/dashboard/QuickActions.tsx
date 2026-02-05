import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  onClick: () => void;
}

export function QuickActions() {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'View Full Team',
      shortLabel: 'Team',
      onClick: () => navigate('/app/team'),
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Check Progress',
      shortLabel: 'Progress',
      onClick: () => navigate('/app/team'),
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Schedule Event',
      shortLabel: 'Schedule',
      onClick: () => navigate('/app/calendar'),
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Send Update',
      shortLabel: 'Update',
      onClick: () => {
        // Scroll to announcements section
        const announcementsSection = document.querySelector('[data-announcements]');
        if (announcementsSection) {
          announcementsSection.scrollIntoView({ behavior: 'smooth' });
        }
      },
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'View Leaderboard',
      shortLabel: 'Leaders',
      onClick: () => navigate('/app/leaderboard'),
    },
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          ⚡ Quick Actions
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-card border border-border/50",
              "text-muted-foreground hover:text-primary",
              "hover:border-primary/50 hover:bg-primary/5",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-sm hover:shadow-primary/10"
            )}
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
            <span className="sm:hidden">{action.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
