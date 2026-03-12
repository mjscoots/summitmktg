import { useNavigate } from 'react-router-dom';
import { Settings2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const actions: QuickAction[] = [
    { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Resources', onClick: () => navigate('/app/links') },
  ];

  if (isManager) {
    actions.unshift(
      { icon: <Settings2 className="w-3.5 h-3.5" />, label: 'Manage', onClick: () => navigate('/app/manage'), primary: true },
    );
  }

  return (
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
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
