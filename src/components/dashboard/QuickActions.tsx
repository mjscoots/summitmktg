import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, ClipboardList, GraduationCap, Trophy, MessagesSquare, Link2, Swords, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  iconColor: string;
  onClick: () => void;
  badge?: number;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const { unreadCount } = useUnreadChat();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const commonActions: QuickAction[] = [
    { icon: <GraduationCap className="w-4 h-4" />, label: 'Training', shortLabel: 'Train', iconColor: 'text-green-400', onClick: () => navigate('/app/training') },
    { icon: <MessagesSquare className="w-4 h-4" />, label: 'Community', shortLabel: 'Chat', iconColor: 'text-blue-300', onClick: () => navigate('/app/chat'), badge: unreadCount },
    { icon: <Swords className="w-4 h-4" />, label: 'War Room', shortLabel: 'War', iconColor: 'text-red-400', onClick: () => navigate('/app/war-room') },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', shortLabel: 'Cal', iconColor: 'text-red-400', onClick: () => navigate('/app/calendar') },
    { icon: <Trophy className="w-4 h-4" />, label: 'Leaderboard', shortLabel: 'Rank', iconColor: 'text-yellow-400', onClick: () => navigate('/app/leaderboard') },
    { icon: <Link2 className="w-4 h-4" />, label: 'Resources', shortLabel: 'Links', iconColor: 'text-purple-400', onClick: () => navigate('/app/links') },
  ];

  const managerOnlyActions: QuickAction[] = [
    { icon: <Calendar className="w-4 h-4" />, label: 'Schedule Event', shortLabel: 'Schedule', iconColor: 'text-orange-400', onClick: () => setIsEventModalOpen(true) },
    { icon: <ClipboardList className="w-4 h-4" />, label: 'Open Forms', shortLabel: 'Forms', iconColor: 'text-orange-400', onClick: () => navigate('/app/forms') },
  ];

  const actions = isManager ? [...commonActions, ...managerOnlyActions] : commonActions;

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
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-card border border-blue-500/20",
                "text-muted-foreground",
                "hover:text-foreground",
                "hover:border-blue-400/50 hover:bg-blue-500/5",
                "shadow-[0_0_6px_-1px_hsl(217,91%,60%,0.15)]",
                "hover:shadow-[0_0_12px_-2px_hsl(217,91%,60%,0.3)]",
                "transition-all duration-200",
                "hover:-translate-y-0.5"
              )}
            >
              <span className={action.iconColor}>{action.icon}</span>
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.shortLabel}</span>
              {action.badge && action.badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {isManager && (
        <ManagerEventForm
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSave={() => setIsEventModalOpen(false)}
        />
      )}
    </>
  );
}
