import { Users, ChevronRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pillar } from '@/lib/hierarchyUtils';

interface PillarCardProps {
  pillar: Pillar;
  onClick: () => void;
}

export function PillarCard({ pillar, onClick }: PillarCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-border/50 p-4 hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">{pillar.name}</h3>
          {pillar.owner && (
            <div className="flex items-center gap-1.5 mt-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm text-primary font-medium">
                {pillar.owner.full_name}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {pillar.totalCount} members
          </span>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            {pillar.managerCount} managers
          </span>
          <span className="px-2 py-0.5 rounded-full bg-success/15 text-success">
            {pillar.rookieCount} rookies
          </span>
        </div>
      </div>
    </button>
  );
}
