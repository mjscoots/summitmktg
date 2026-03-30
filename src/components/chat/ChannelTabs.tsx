import { cn } from '@/lib/utils';
import { Hash, MessageSquare, Shield } from 'lucide-react';

interface ChannelTab {
  slug: string;
  label: string;
  icon: 'hash' | 'feedback' | 'team';
}

interface ChannelTabsProps {
  tabs: ChannelTab[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

const iconMap = {
  hash: Hash,
  feedback: MessageSquare,
  team: Shield,
};

export function ChannelTabs({ tabs, activeSlug, onSelect }: ChannelTabsProps) {
  return (
    <div className="flex gap-1 px-3 py-1.5 border-b border-border/10 bg-background/40 backdrop-blur-xl overflow-x-auto no-scrollbar flex-shrink-0">
      {tabs.map(tab => {
        const Icon = iconMap[tab.icon];
        const active = tab.slug === activeSlug;
        return (
          <button
            key={tab.slug}
            onClick={() => onSelect(tab.slug)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Map team IDs to channel slugs
const TEAM_CHANNEL_MAP: Record<string, string> = {
  '33c06944-8cf7-4715-b3be-30edcb179385': 'team-apex',
  '842752b6-3b83-4804-9420-5b581eed6186': 'team-atlas',
  'e3a80a20-eb7c-418b-8245-574386cf8d88': 'team-legion-mafia',
  '1bf767e3-973b-4627-bed5-25754f191aa2': 'team-minions',
  '2319c15f-5948-4084-a629-76f2287a51ba': 'team-paper-route',
  'b70b5867-7e24-483c-8616-dc32b7f44780': 'team-parks',
  '7d08483a-cb25-4acd-8b0b-ef9baaf187b9': 'team-quality-control',
};

const TEAM_LABELS: Record<string, string> = {
  'team-apex': 'Apex',
  'team-atlas': 'Atlas',
  'team-legion-mafia': 'Legion Mafia',
  'team-minions': 'Minions',
  'team-paper-route': 'Paper Route',
  'team-parks': 'PARKS',
  'team-quality-control': 'Quality Control',
};

export function getTeamChannelSlug(teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  return TEAM_CHANNEL_MAP[teamId] || null;
}

export function getTeamLabel(slug: string): string {
  return TEAM_LABELS[slug] || slug;
}

export function buildChannelTabs(teamSlug: string | null, isManagerOrAbove: boolean): ChannelTab[] {
  const tabs: ChannelTab[] = [
    { slug: 'general', label: 'Feed', icon: 'hash' },
    { slug: 'feedback', label: 'Feedback', icon: 'feedback' },
  ];

  if (teamSlug) {
    tabs.push({ slug: teamSlug, label: getTeamLabel(teamSlug), icon: 'team' });
  }

  // Managers/admins/owners can see all team channels
  if (isManagerOrAbove) {
    Object.entries(TEAM_LABELS).forEach(([slug, label]) => {
      if (slug !== teamSlug) {
        tabs.push({ slug, label, icon: 'team' });
      }
    });
  }

  return tabs;
}
