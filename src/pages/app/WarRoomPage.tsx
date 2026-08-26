import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { BarChart3, Activity, Users, Clock, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DownlineTab } from '@/components/warroom/DownlineTab';
import { TeamsTab } from '@/components/warroom/TeamsTab';
import { PulseTab } from '@/components/warroom/PulseTab';
import { ActivityTab } from '@/components/warroom/ActivityTab';

type WarRoomTab = 'downline' | 'teams' | 'pulse' | 'activity';

const TABS: { id: WarRoomTab; label: string; icon: typeof Activity }[] = [
  { id: 'downline', label: 'Downline', icon: Users },
  { id: 'teams', label: 'Teams', icon: Network },
  { id: 'pulse', label: 'Pulse', icon: Activity },
  { id: 'activity', label: 'Activity', icon: Clock },
];

export default function WarRoomPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<WarRoomTab>('downline');

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <PageBackButton to="/app/team" label="Team" />

          <header className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Team stats</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Training, progress and accountability across your teams.
            </p>
          </header>

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
                    <Icon className={cn("w-3.5 h-3.5", activeTab === tab.id && "text-primary")} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'downline' && <DownlineTab managerName={profile?.full_name || ''} userId={user?.id || ''} />}
          {activeTab === 'teams' && <TeamsTab managerName={profile?.full_name || ''} />}
          {activeTab === 'pulse' && <PulseTab managerName={profile?.full_name || ''} userId={user?.id || ''} />}
          {activeTab === 'activity' && <ActivityTab managerName={profile?.full_name || ''} userId={user?.id || ''} />}
        </div>
      </div>
    </AppLayout>
  );
}
