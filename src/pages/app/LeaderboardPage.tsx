import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { Trophy, Flame, Calendar, Info, Mountain, Users } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PointSystemModal } from '@/components/points/PointSystemModal';

type LeaderboardTab = 'overall' | 'weekly' | 'streak';

const GRID_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const { role } = useAuth();
  const [showPointSystem, setShowPointSystem] = useState(false);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const TAB_META: Record<LeaderboardTab, { subtitle: string; icon: React.ReactNode }> = {
    weekly: {
      subtitle: 'Includes managers & rookies',
      icon: (
        <span className="inline-flex items-center gap-0.5">
          <Mountain className="w-3 h-3 text-primary" />
          <Mountain className="w-3 h-3 text-success -ml-1.5" />
        </span>
      ),
    },
    overall: {
      subtitle: 'Includes managers & rookies · All time',
      icon: (
        <span className="inline-flex items-center gap-0.5">
          <Mountain className="w-3 h-3 text-primary" />
          <Mountain className="w-3 h-3 text-success -ml-1.5" />
        </span>
      ),
    },
    streak: {
      subtitle: 'Includes everyone',
      icon: <Users className="w-3.5 h-3.5 text-orange-400" />,
    },
  };

  const TABS: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'weekly', label: 'This Week', icon: Calendar },
    { id: 'overall', label: 'All-Time', icon: Trophy },
    { id: 'streak', label: 'Streaks', icon: Flame },
  ];

  const meta = TAB_META[activeTab];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />

          {/* Hero Banner — Training page style */}
          <div className="relative h-24 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-yellow-500/15 to-orange-500/25" />
            <div className={cn('absolute inset-0 opacity-50', GRID_PATTERN)} />
            {/* Golden spotlight glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(234,179,8,0.12),transparent_60%)]" />
            <div className="absolute inset-0 flex items-center justify-between px-6">
              <div className="flex flex-col items-start justify-center">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
                  LEADERBOARD
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Outwork everyone. No excuses.
                </p>
              </div>
              {/* Points Guide — glowing pill */}
              <button
                onClick={() => setShowPointSystem(true)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full',
                  'bg-warning/15 border border-warning/30',
                  'text-warning text-xs font-bold uppercase tracking-wide',
                  'transition-all duration-300',
                  'hover:bg-warning/25 hover:border-warning/50',
                  'hover:-translate-y-0.5 hover:shadow-[0_0_20px_-4px_rgba(234,179,8,0.4)]'
                )}
              >
                <Info className="w-4 h-4" />
                Points Guide
              </button>
            </div>
          </div>

          {/* Filter Tabs — pill style */}
          <div className="flex gap-2 mb-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl',
                    'transition-all duration-300 border-2',
                    isActive
                      ? 'bg-card border-primary/40 text-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]'
                      : 'bg-card/50 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 hover:-translate-y-0.5'
                  )}
                >
                  <Icon className={cn(
                    'w-3.5 h-3.5',
                    isActive && (tab.id === 'streak' ? 'text-orange-500' : 'text-primary')
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Inclusion Banner — only for managers */}
          {isManager && (
            <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 rounded-lg bg-muted/30 border border-border/20">
              {meta.icon}
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{meta.subtitle}</span>
            </div>
          )}

          {/* Content */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xl shadow-black/5">
            {activeTab === 'overall' && <TrainingLeaderboard mode="overall" />}
            {activeTab === 'weekly' && <TrainingLeaderboard mode="weekly" />}
            {activeTab === 'streak' && <StreakLeaderboard />}
          </div>
        </main>
      </div>

      <PointSystemModal open={showPointSystem} onOpenChange={setShowPointSystem} />
    </AppLayout>
  );
}
