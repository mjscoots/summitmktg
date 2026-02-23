import { PrepRep } from '@/hooks/useOneOnOnePrep';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Clock, Loader2, TrendingUp } from 'lucide-react';

interface RepSelectionListProps {
  needsAttention: PrepRep[];
  onTrack: PrepRep[];
  completedRepIds: Set<string>;
  onSelect: (userId: string) => void;
  loading: boolean;
  totalReps: number;
  completedCount: number;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function RepRow({ rep, completed, onSelect }: { rep: PrepRep; completed: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left',
        completed
          ? 'border-green-500/30 bg-green-500/5 opacity-60'
          : 'border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30'
      )}
    >
      {/* Avatar */}
      {rep.avatar_url ? (
        <img src={rep.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
          {rep.full_name.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{rep.full_name}</span>
          {completed && <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatMinutes(rep.lastWeekMinutes)}</span>
          <span>•</span>
          <span>{rep.lastWeekDaysActive}/7 days</span>
          <span>•</span>
          <span>{rep.trainingProgress}%</span>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex-shrink-0">
        {rep.lastWeekMinutes === 0 ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
            ⚠️ No activity
          </span>
        ) : rep.lastWeekMinutes / 7 < 20 ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
            ⚠️ Low avg
          </span>
        ) : rep.peerRank === 1 ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
            ✅ #1
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
            ✅ On pace
          </span>
        )}
      </div>
    </button>
  );
}

export function RepSelectionList({
  needsAttention,
  onTrack,
  completedRepIds,
  onSelect,
  loading,
  totalReps,
  completedCount,
}: RepSelectionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading roster...</span>
      </div>
    );
  }

  if (totalReps === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No team members found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${totalReps > 0 ? (completedCount / totalReps) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedCount} of {totalReps} completed
        </span>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Attention ({needsAttention.length})
          </h3>
          <div className="space-y-2">
            {needsAttention.map(rep => (
              <RepRow
                key={rep.user_id}
                rep={rep}
                completed={completedRepIds.has(rep.user_id)}
                onSelect={() => onSelect(rep.user_id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 text-center">
          <span className="text-sm text-green-500">🎉 Everyone on track!</span>
        </div>
      )}

      {/* On Track */}
      {onTrack.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            On Track ({onTrack.length})
          </h3>
          <div className="space-y-2">
            {onTrack.map(rep => (
              <RepRow
                key={rep.user_id}
                rep={rep}
                completed={completedRepIds.has(rep.user_id)}
                onSelect={() => onSelect(rep.user_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
