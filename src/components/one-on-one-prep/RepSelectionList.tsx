import { useMemo } from 'react';
import { PrepRep } from '@/hooks/useOneOnOnePrep';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, GripVertical, Loader2, RotateCcw } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RepSelectionListProps {
  orderedReps: PrepRep[];
  completedRepIds: Set<string>;
  onSelect: (userId: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onReset: () => void;
  loading: boolean;
  totalReps: number;
  completedCount: number;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function SortableRepRow({ rep, onSelect }: { rep: PrepRep; onSelect: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rep.user_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full flex items-center gap-2 rounded-lg border transition-all',
        isDragging && 'z-50 shadow-lg scale-[1.02] opacity-90',
        'border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30'
      )}
    >
      <button
        className="pl-2 py-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 pr-4 py-3 text-left min-w-0"
      >
        {rep.avatar_url ? (
          <img src={rep.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
            {rep.full_name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{rep.full_name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatMinutes(rep.lastWeekMinutes)}</span>
            <span>•</span>
            <span>{rep.lastWeekDaysActive}/7 days</span>
            <span>•</span>
            <span>{rep.trainingProgress}%</span>
          </div>
        </div>

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
    </div>
  );
}

function CompletedRepRow({ rep, onSelect }: { rep: PrepRep; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-green-500/20 bg-green-500/5 text-left opacity-70 hover:opacity-90 transition-opacity"
    >
      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      {rep.avatar_url ? (
        <img src={rep.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-green-600">
          {rep.full_name.charAt(0)}
        </div>
      )}
      <span className="text-sm text-foreground/70 truncate">{rep.full_name}</span>
      <span className="ml-auto text-[10px] text-green-600 font-medium">Done</span>
    </button>
  );
}

export function RepSelectionList({
  orderedReps,
  completedRepIds,
  onSelect,
  onReorder,
  onReset,
  loading,
  totalReps,
  completedCount,
}: RepSelectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { incompleteReps, completedReps } = useMemo(() => {
    const incomplete = orderedReps.filter(r => !completedRepIds.has(r.user_id));
    const completed = orderedReps.filter(r => completedRepIds.has(r.user_id));
    return { incompleteReps: incomplete, completedReps: completed };
  }, [orderedReps, completedRepIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find indices in the incomplete list
    const oldIncIdx = incompleteReps.findIndex(r => r.user_id === active.id);
    const newIncIdx = incompleteReps.findIndex(r => r.user_id === over.id);
    if (oldIncIdx === -1 || newIncIdx === -1) return;

    // Map back to full orderedReps indices
    const oldFullIdx = orderedReps.findIndex(r => r.user_id === active.id);
    const newFullIdx = orderedReps.findIndex(r => r.user_id === over.id);
    if (oldFullIdx !== -1 && newFullIdx !== -1) {
      onReorder(oldFullIdx, newFullIdx);
    }
  };

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
    <div className="space-y-5">
      {/* Progress bar */}
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

      {/* To Do section */}
      {incompleteReps.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              To Do ({incompleteReps.length})
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground">Drag to reorder</p>
              <Button variant="ghost" size="sm" onClick={onReset} className="h-6 text-[10px] gap-1 px-2">
                <RotateCcw className="w-3 h-3" /> A–Z
              </Button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={incompleteReps.map(r => r.user_id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {incompleteReps.map(rep => (
                  <SortableRepRow
                    key={rep.user_id}
                    rep={rep}
                    onSelect={() => onSelect(rep.user_id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="text-center py-10 rounded-lg border border-green-500/20 bg-green-500/5">
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-medium text-foreground mt-2">All 1:1s completed for this week!</p>
          <p className="text-xs text-muted-foreground mt-1">{completedCount} reps checked in</p>
        </div>
      )}

      {/* Completed section — collapsed by default */}
      {completedReps.length > 0 && (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-600 hover:text-green-500 transition-colors w-full group">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
            Completed ({completedReps.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-1.5">
            {completedReps.map(rep => (
              <CompletedRepRow
                key={rep.user_id}
                rep={rep}
                onSelect={() => onSelect(rep.user_id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
