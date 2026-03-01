import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { Trophy, Flame, Swords, Calendar, Zap } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type LeaderboardTab = 'overall' | 'weekly' | 'streak';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('overall');

  const TABS: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'overall', label: 'All-Time', icon: Trophy },
    { id: 'weekly', label: 'This Week', icon: Calendar },
    { id: 'streak', label: 'Streaks', icon: Flame },
  ];

  return (
    <AppLayout>
      <ScrollArea className="h-full">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />

          {/* Aggressive Header */}
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
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  LEADERBOARD
                  <span className="text-yellow-400 animate-pulse">⚡</span>
                </h1>
                <p className="text-xs text-yellow-200/60 font-bold uppercase tracking-widest mt-0.5">Outwork everyone. No excuses.</p>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="p-1 bg-gradient-to-r from-muted/80 to-muted/50 rounded-xl mb-6 border border-border/40">
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

          {/* Content */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xl shadow-black/5">
            {activeTab === 'overall' && <TrainingLeaderboard mode="overall" />}
            {activeTab === 'weekly' && <TrainingLeaderboard mode="weekly" />}
            {activeTab === 'streak' && <StreakLeaderboard />}
          </div>
        </main>
      </ScrollArea>
    </AppLayout>
  );
}
