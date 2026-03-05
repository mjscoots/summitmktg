import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { Trophy, Flame, Swords, Calendar, Zap, Mountain, Users, Info } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PointSystemModal } from '@/components/points/PointSystemModal';

type LeaderboardTab = 'overall' | 'weekly' | 'streak';

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

          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-yellow-950 via-amber-900/60 to-red-900/40 border border-yellow-500/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(234,179,8,0.15),transparent_50%)]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4 px-6 py-5">
              <div className="relative">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
                  <Swords className="w-7 h-7 text-yellow-400" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  LEADERBOARD
                  <span className="text-yellow-400 animate-pulse">⚡</span>
                </h1>
                <p className="text-xs text-yellow-200/60 font-bold uppercase tracking-widest mt-0.5">Outwork everyone. No excuses.</p>
              </div>
              {/* Points Guide Button */}
              <button
                onClick={() => setShowPointSystem(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 transition-colors text-xs font-bold uppercase tracking-wide"
              >
                <Info className="w-3.5 h-3.5" />
                Points Guide
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="p-1 bg-gradient-to-r from-muted/80 to-muted/50 rounded-xl mb-4 border border-border/40">
            <div className="flex">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-lg transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-card text-foreground shadow-lg shadow-primary/10 border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5",
                      activeTab === tab.id && (tab.id === 'streak' ? "text-orange-500" : "text-primary")
                    )} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
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