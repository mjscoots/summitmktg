import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CalendarDays, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  onClick: () => void;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'View Team',
      shortLabel: 'Team',
      onClick: () => navigate('/app/team'),
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Schedule Event',
      shortLabel: 'Schedule',
      onClick: () => setIsEventModalOpen(true),
    },
    {
      icon: <CalendarDays className="w-4 h-4" />,
      label: 'Open Calendar',
      shortLabel: 'Calendar',
      onClick: () => navigate('/app/calendar'),
    },
    {
      icon: <ClipboardList className="w-4 h-4" />,
      label: 'Open Forms',
      shortLabel: 'Forms',
      onClick: () => navigate('/app/forms'),
    },
  ];

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
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
                "text-muted-foreground",
                "hover:text-primary",
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

      <ManagerEventForm
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={() => setIsEventModalOpen(false)}
      />
    </>
  );
}
