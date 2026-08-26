import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { RecruitingLeaderboard } from '@/components/leaderboard/RecruitingLeaderboard';
import { WeekPaceStrip } from '@/components/leaderboard/WeekPaceStrip';
import { TeamBattles } from '@/components/leaderboard/TeamBattles';
import { IncentiveTracker } from '@/components/leaderboard/IncentiveTracker';
import { SeasonBanner } from '@/components/leaderboard/SeasonBanner';
import { HallOfFame } from '@/components/leaderboard/HallOfFame';

import { Trophy, Flame, Calendar, Info, Mountain, Users, Target, Crown } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { isManagerOrAbove } from '@/lib/roles';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceLeaderboard } from '@/components/leaderboard/WorkspaceLeaderboard';

type LeaderboardTab = 'overall' | 'weekly' | 'streak' | 'recruiting' | 'hof';



export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const { role } = useAuth();
  const { active, activeVertical } = useWorkspace();
  const isPest = activeVertical === 'Pest';
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
    hof: {
      subtitle: 'Past seasons · frozen results',
      icon: <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />,
    },
  };


  const TABS: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'weekly', label: 'This Week', icon: Calendar },
    { id: 'overall', label: 'All-Time', icon: Trophy },
    { id: 'streak', label: 'Streaks', icon: Flame },
    { id: 'recruiting', label: 'Recruiting', icon: Target },
    { id: 'hof', label: 'Hall of Fame', icon: Crown },

  ];

  const meta = TAB_META[activeTab];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />

          {/* Page header */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-foreground">Leaderboard</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Where you stand this week and all time.</p>
            </div>
            <button
              onClick={() => setShowPointSystem(true)}
              className="btn-secondary shrink-0 self-start"
            >
              <Info className="w-4 h-4" />
              How points work
            </button>
          </div>

          {isPest && (
            <>
              <SeasonBanner />
              <WeekPaceStrip />
            </>
          )}


          {/* Filter Tabs — pill style */}

          {isPest && (
          <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center justify-center gap-1.5 min-h-[44px] px-4 text-[13px] font-semibold rounded-[var(--radius)] sm:flex-1',
                    'border transition-colors duration-150',
                    isActive
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          )}


          {/* Inclusion Banner — only for managers */}
          {isPest && isManager && (
            <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 rounded-lg bg-muted/30 border border-border/20">
              {meta.icon}
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{meta.subtitle}</span>
            </div>
          )}

          {/* Content */}
          <div className="glass-card overflow-hidden">
            {!isPest && active && (
              <WorkspaceLeaderboard vertical={active.vertical} unit={active.unit || 'installs'} />
            )}
            {isPest && activeTab === 'overall' && <TrainingLeaderboard mode="overall" />}
            {isPest && activeTab === 'weekly' && <TrainingLeaderboard mode="weekly" />}
            {isPest && activeTab === 'streak' && <StreakLeaderboard />}
            {isPest && activeTab === 'recruiting' && <RecruitingLeaderboard />}

          </div>

          {isPest && (
            <div className="mt-6 space-y-4">
              <TeamBattles />
              <IncentiveTracker />
            </div>
          )}

        </main>
      </div>

      <PointSystemModal open={showPointSystem} onOpenChange={setShowPointSystem} />
    </AppLayout>
  );
}
