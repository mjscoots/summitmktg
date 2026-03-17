import { useNavigate } from 'react-router-dom';
import { Swords, FileText, Users, BookOpen, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string; // tailwind color name
}

const MANAGER_ACTIONS: QuickAction[] = [
  { icon: <Swords className="w-4 h-4" />, label: 'My Team', path: '/app/war-room', color: 'orange' },
  { icon: <FileText className="w-4 h-4" />, label: 'Forms', path: '/app/forms', color: 'blue' },
  { icon: <Users className="w-4 h-4" />, label: 'Recruiting', path: '/app/recruiting', color: 'cyan' },
  { icon: <BookOpen className="w-4 h-4" />, label: 'Resources', path: '/app/links', color: 'amber' },
  { icon: <Video className="w-4 h-4" />, label: 'Pitch Approvals', path: '/app/pitch-approvals', color: 'purple' },
];

const COLOR_MAP: Record<string, { text: string; border: string; bg: string; hoverBorder: string }> = {
  orange:  { text: 'text-orange-400',  border: 'border-orange-500/20',  bg: 'bg-orange-500/5',  hoverBorder: 'hover:border-orange-500/50' },
  blue:    { text: 'text-blue-400',    border: 'border-blue-500/20',    bg: 'bg-blue-500/5',    hoverBorder: 'hover:border-blue-500/50' },
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', hoverBorder: 'hover:border-emerald-500/50' },
  cyan:    { text: 'text-cyan-400',    border: 'border-cyan-500/20',    bg: 'bg-cyan-500/5',    hoverBorder: 'hover:border-cyan-500/50' },
  amber:   { text: 'text-amber-400',   border: 'border-amber-500/20',   bg: 'bg-amber-500/5',   hoverBorder: 'hover:border-amber-500/50' },
  purple:  { text: 'text-purple-400',  border: 'border-purple-500/20',  bg: 'bg-purple-500/5',  hoverBorder: 'hover:border-purple-500/50' },
};

export function QuickActions() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  if (!isManager) return null;

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        {MANAGER_ACTIONS.map((action) => {
          const c = COLOR_MAP[action.color];
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
                "border bg-card/60 backdrop-blur-sm",
                "transition-all duration-200 cursor-pointer",
                "hover:-translate-y-0.5 active:scale-[0.97]",
                c.text, c.border, c.hoverBorder,
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
