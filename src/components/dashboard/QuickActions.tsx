import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, Link2, Swords, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  iconColor: string;
  onClick: () => void;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const actions: QuickAction[] = [
    { icon: <Calendar className="w-4 h-4" />, label: 'Calendar', shortLabel: 'Cal', iconColor: 'text-red-400', onClick: () => navigate('/app/calendar') },
    { icon: <Link2 className="w-4 h-4" />, label: 'Resources', shortLabel: 'Links', iconColor: 'text-purple-400', onClick: () => navigate('/app/links') },
    { icon: <Swords className="w-4 h-4" />, label: 'War Room', shortLabel: 'War', iconColor: 'text-orange-400', onClick: () => navigate('/app/war-room') },
    { icon: <FileText className="w-4 h-4" />, label: 'Notepad', shortLabel: 'Notes', iconColor: 'text-emerald-400', onClick: () => navigate('/app/notepad') },
  ];

  if (isManager) {
    actions.unshift(
      { icon: <Calendar className="w-4 h-4" />, label: 'Schedule Event', shortLabel: 'Schedule', iconColor: 'text-blue-400', onClick: () => setIsEventModalOpen(true) },
      { icon: <ClipboardList className="w-4 h-4" />, label: 'Forms', shortLabel: 'Forms', iconColor: 'text-amber-400', onClick: () => navigate('/app/forms') },
    );
    // Remove duplicate Calendar for managers (they have Schedule Event instead)
    const calIdx = actions.findIndex((a, i) => i > 1 && a.label === 'Calendar');
    if (calIdx > -1) actions.splice(calIdx, 1);
  }

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
