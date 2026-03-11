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
  onClick: () => void;
  primary?: boolean;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const actions: QuickAction[] = [
    { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Calendar', shortLabel: 'Cal', onClick: () => navigate('/app/calendar') },
    { icon: <Link2 className="w-3.5 h-3.5" />, label: 'Resources', shortLabel: 'Links', onClick: () => navigate('/app/links') },
    { icon: <Swords className="w-3.5 h-3.5" />, label: 'War Room', shortLabel: 'War', onClick: () => navigate('/app/war-room') },
    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Notepad', shortLabel: 'Notes', onClick: () => navigate('/app/notepad') },
  ];

  if (isManager) {
    actions.unshift(
      { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Schedule', shortLabel: 'Schedule', onClick: () => setIsEventModalOpen(true), primary: true },
      { icon: <ClipboardList className="w-3.5 h-3.5" />, label: 'Forms', shortLabel: 'Forms', onClick: () => navigate('/app/forms') },
    );
    const calIdx = actions.findIndex((a, i) => i > 1 && a.label === 'Calendar');
    if (calIdx > -1) actions.splice(calIdx, 1);
  }

  return (
    <>
      <div className="mb-5">
        <div className="flex flex-wrap gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                "hover:-translate-y-0.5 active:scale-95",
                action.primary
                  ? "text-primary-foreground hover:shadow-[0_0_20px_-5px_hsl(217_91%_60%/0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:shadow-[0_4px_16px_-4px_hsl(0_0%_0%/0.3)]",
              )}
              style={action.primary
                ? { background: 'var(--gradient-primary)' }
                : { background: 'hsl(var(--glass-bg))', border: '1px solid hsl(var(--glass-border))' }
              }
            >
              {action.icon}
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
