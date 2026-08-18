import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { RecruitingLeaderboard } from '@/components/leaderboard/RecruitingLeaderboard';
import { Trophy, Flame, Calendar, Info, Mountain, Users, Target } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { isManagerOrAbove } from '@/lib/roles';

type LeaderboardTab = 'overall' | 'weekly' | 'streak' | 'recruiting';

const GRID_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const { role } = useAuth();
  const [showPointSystem, setShowPointSystem] = useState(false);

  const isManager = isManagerOrAbove(role);

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
      icon: <Users className="w-3.5 h-3.5 text-primary" />,
    },
    recruiting: {
      subtitle: 'Signed leads this month',
      icon: <Target className="w-3.5 h-3.5 text-primary" />,
    },
  };

  const TABS: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'weekly', label: 'This Week', icon: Calendar },
    { id: 'overall', label: 'All-Time', icon: Trophy },
    { id: 'streak', label: 'Streaks', icon: Flame },
    { id: 'recruiting', label: 'Recruiting', icon: Target },
  ];

  const meta = TAB_META[activeTab];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />

          {/* Hero Banner — Training page style */}
          <div className="relative rounded-[var(--radius)] overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-yellow-500/15 to-orange-500/25" />
            <div className={cn('absolute inset-0 opacity-50', GRID_PATTERN)} />
            {/* Golden spotlight glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(234,179,8,0.12),transparent_60%)]" />
            <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
              <div className="flex flex-col items-start justify-center">
                <h1 className="text-foreground drop-shadow-sm">LEADERBOARD</h1>
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  Outwork everyone. No excuses.
                </p>
              </div>
              {/* Points Guide — glowing pill */}
              <button
                onClick={() => setShowPointSystem(true)}
                className={cn(
                  'shrink-0 self-start inline-flex min-h-11 items-center gap-2 px-4 rounded-full',
                  'bg-warning/15 border border-warning/30',
                  'text-warning text-[11px] font-bold uppercase tracking-micro',
                  'transition-all duration-200',
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
          <div className="grid grid-cols-2 gap-2 mb-4 sm:flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-[13px] font-bold rounded-xl sm:flex-1',
                    'transition-all duration-200 border',
                    isActive
                      ? 'bg-card border-primary/40 text-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]'
                      : 'bg-card/50 border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
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
            {activeTab === 'recruiting' && <RecruitingLeaderboard />}
          </div>
        </main>
      </div>

      <PointSystemModal open={showPointSystem} onOpenChange={setShowPointSystem} />
    </AppLayout>
  );
}
