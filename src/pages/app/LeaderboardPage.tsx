import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { TrainingLeaderboardPanel } from '@/components/training/TrainingLeaderboardPanel';
import { Trophy, Flame, GraduationCap, Swords } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';

type LeaderboardTab = 'training' | 'streak' | 'completion';

const TABS: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
  { id: 'training', label: 'Overall', icon: Trophy },
  { id: 'streak', label: 'Streak', icon: Flame },
  { id: 'completion', label: 'Progress', icon: GraduationCap },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('training');

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20">
            <Swords className="w-5 h-5 text-yellow-500" />
            <div className="absolute inset-0 rounded-xl bg-yellow-500/5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">LEADERBOARD</h1>
            <p className="text-xs text-muted-foreground font-medium">Rookies only · This week · Dominate or be dominated</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="p-1 bg-muted/50 rounded-xl mb-6 border border-border/30">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md shadow-primary/10 border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-3.5 h-3.5",
                    activeTab === tab.id && "text-primary"
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {activeTab === 'training' && <TrainingLeaderboard />}
          {activeTab === 'streak' && <StreakLeaderboard />}
          {activeTab === 'completion' && <TrainingLeaderboardPanel />}
        </div>
      </main>
    </AppLayout>
  );
}
