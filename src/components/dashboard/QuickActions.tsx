import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { AnnouncementModal } from '@/components/dashboard/AnnouncementModal';

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
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Navigate directly to user's team page
  const handleViewTeam = () => {
    if (profile?.team_id) {
      navigate(`/app/team`);
    } else {
      navigate('/app/team');
    }
  };

  const actions: QuickAction[] = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'View Full Team',
      shortLabel: 'Team',
      onClick: handleViewTeam,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Schedule Event',
      shortLabel: 'Schedule',
      onClick: () => setIsEventModalOpen(true),
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Send Update',
      shortLabel: 'Update',
      onClick: () => setIsAnnouncementModalOpen(true),
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'View Leaderboard',
      shortLabel: 'Leaders',
      onClick: () => navigate('/app/leaderboard'),
    },
  ];

  return (
    <>
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

      {/* Event Creation Modal */}
      <ManagerEventForm
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={() => setIsEventModalOpen(false)}
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
      />
    </>
  );
}
