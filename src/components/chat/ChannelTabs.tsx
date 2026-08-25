import { cn } from '@/lib/utils';
import { Hash, MessageSquare, Shield, Trophy, Users, Megaphone, Lightbulb, Sparkles } from 'lucide-react';

export interface ChannelTab {
  slug: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  unread?: number;
}

interface ChannelTabsProps {
  tabs: ChannelTab[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

const iconMap: Record<string, typeof Hash> = {
  Hash: Hash,
  hash: Hash,
  MessageSquare,
  feedback: MessageSquare,
  Lightbulb,
  Megaphone,
  Shield,
  team: Shield,
  Trophy,
  Users,
  Sparkles,
};

export function ChannelTabs({ tabs, activeSlug, onSelect }: ChannelTabsProps) {
  return (
    <div className="no-scrollbar flex flex-shrink-0 gap-1.5 overflow-x-auto border-b border-border/20 bg-background/40 px-3 py-2 backdrop-blur-xl">
      {tabs.map(tab => {
        const Icon = iconMap[tab.icon || 'Hash'] || Hash;
        const active = tab.slug === activeSlug;
        const unread = tab.unread || 0;
        return (
          <button
            key={tab.slug}
            onClick={() => onSelect(tab.slug)}
            className={cn(
              "relative flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition-all duration-180",
              active
                ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="max-w-[8.5rem] truncate">{tab.label}</span>
            {!active && unread > 0 && (
              <span className="ml-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-4 text-primary-foreground">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
