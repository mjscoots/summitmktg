import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingLeaderboard } from '@/components/leaderboard/TrainingLeaderboard';
import { SigningsLeaderboard } from '@/components/leaderboard/SigningsLeaderboard';
import { StreakLeaderboard } from '@/components/leaderboard/StreakLeaderboard';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeaderboardTab = 'training' | 'streak';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('training');

  const tabs: { id: LeaderboardTab; label: string }[] = [
    { id: 'training', label: 'Training' },
    { id: 'streak', label: 'Streak' },
  ];

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-success/15">
            <Trophy className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Rookies only • This week</p>
          </div>
        </div>

        {/* Apple-style Segmented Control */}
        <div className="p-1 bg-muted/50 rounded-lg mb-6">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="bg-card rounded-lg border border-border/50">
          {activeTab === 'training' && <TrainingLeaderboard />}
          {activeTab === 'streak' && <StreakLeaderboard />}
        </div>
      </main>
    </AppLayout>
  );
}