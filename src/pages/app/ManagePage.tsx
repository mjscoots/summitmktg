import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Swords, FileText, Video, BookOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isManagerOrAbove } from '@/lib/roles';

const GRID_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]";

export default function ManagePage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = isManagerOrAbove(role);

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">This page is for managers only.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Hero Banner */}
        <div className="relative h-24 rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-primary/20" />
          <div className={cn('absolute inset-0 opacity-50', GRID_PATTERN)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
              MANAGE
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leadership tools and performance controls
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* My Team */}
          <button
            onClick={() => navigate('/app/war-room')}
            className={cn(
              'group relative w-full p-5 bg-card rounded-xl text-left overflow-hidden',
              'border border-border/50 cursor-pointer',
              'transition-all duration-300 hover:scale-[1.01]',
              'hover:border-primary/40',
              'hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.4)]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 group-hover:bg-primary/25 text-primary transition-colors">
                <Swords className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">My Team</h2>
              </div>
            </div>
          </button>

          {/* Forms */}
          <button
            onClick={() => navigate('/app/forms')}
            className={cn(
              'group relative w-full p-5 bg-card rounded-xl text-left overflow-hidden',
              'border border-border/50 cursor-pointer',
              'transition-all duration-300 hover:scale-[1.01]',
              'hover:border-blue-500/40',
              'hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 group-hover:bg-blue-500/25 text-blue-400 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">Forms</h2>
              </div>
            </div>
          </button>

          {/* Recruiting Board */}
          <button
            onClick={() => navigate('/app/recruiting')}
            className={cn(
              'group relative w-full p-5 bg-card rounded-xl text-left overflow-hidden',
              'border border-border/50 cursor-pointer',
              'transition-all duration-300 hover:scale-[1.01]',
              'hover:border-cyan-500/40',
              'hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.4)]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 group-hover:bg-cyan-500/25 text-cyan-400 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">Funnel Tracker</h2>
              </div>
            </div>
          </button>

          {/* Resources */}
          <button
            onClick={() => navigate('/app/links')}
            className={cn(
              'group relative w-full p-5 bg-card rounded-xl text-left overflow-hidden',
              'border border-border/50 cursor-pointer',
              'transition-all duration-300 hover:scale-[1.01]',
              'hover:border-primary/40',
              'hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.4)]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 group-hover:bg-primary/25 text-primary transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">Resources</h2>
              </div>
            </div>
          </button>
        </div>

        {/* Pitch Approvals — featured module */}
        <button
          onClick={() => navigate('/app/pitch-approvals')}
          className={cn(
            'group relative w-full p-5 rounded-xl text-center overflow-hidden cursor-pointer',
            'border border-purple-500/30',
            'transition-all duration-300',
            'hover:border-purple-500/60',
            'hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.4)]',
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(270 60% 15% / 0.6), hsl(270 50% 20% / 0.3), hsl(270 60% 15% / 0.6))',
          }}
        >
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Pitch Approvals & Rep Videos</h2>
          </div>
        </button>
      </div>
    </AppLayout>
  );
}
