import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { TRIAGE_BUCKETS, TRIAGE_META, TriageBucket } from '@/lib/triage';
import { GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Rep {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

function RepCard({
  rep,
  bucket,
  onMove,
  dragging,
}: {
  rep: Rep;
  bucket: TriageBucket;
  onMove: (userId: string, bucket: TriageBucket) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: rep.user_id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-white/[0.06] bg-card/60 px-2.5 py-2 backdrop-blur-sm',
        (isDragging || dragging) && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${getDisplayName(rep.full_name)}`}
        className="touch-none text-muted-foreground/60 hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {getDisplayName(rep.full_name)}
      </span>
      {/* Tap fallback so the board is fully usable on touch */}
      <select
        value={bucket}
        onChange={e => onMove(rep.user_id, e.target.value as TriageBucket)}
        aria-label="Move to bucket"
        className="max-w-[92px] rounded-md border border-white/[0.08] bg-background/60 px-1.5 py-1 text-[11px] text-muted-foreground"
      >
        {TRIAGE_BUCKETS.map(b => (
          <option key={b} value={b}>
            {TRIAGE_META[b].label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Column({
  bucket,
  reps,
  onMove,
  activeId,
}: {
  bucket: TriageBucket;
  reps: Rep[];
  onMove: (userId: string, bucket: TriageBucket) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });
  const meta = TRIAGE_META[bucket];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[140px] flex-col rounded-2xl border bg-card/40 p-3 transition-colors',
        meta.column,
        isOver && 'bg-primary/[0.06] ring-1 ring-primary/30'
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', meta.bar)} />
        <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{reps.length}</span>
      </div>
      <div className="space-y-2">
        {reps.map(r => (
          <RepCard
            key={r.user_id}
            rep={r}
            bucket={bucket}
            onMove={onMove}
            dragging={activeId === r.user_id}
          />
        ))}
        {reps.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/[0.06] px-2 py-4 text-center text-[11px] text-muted-foreground">
            Drop reps here
          </p>
        )}
      </div>
    </div>
  );
}

/** Live rep triage board - managers+ only. Persisted to rep_triage. */
export function TriageBoard() {
  const { user } = useAuth();
  const [reps, setReps] = useState<Rep[]>([]);
  const [buckets, setBuckets] = useState<Record<string, TriageBucket>>({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: triage }] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('archived', false)
        .order('full_name'),
      supabase.from('rep_triage').select('user_id, bucket'),
    ]);

    const map: Record<string, TriageBucket> = {};
    (triage ?? []).forEach(t => {
      map[t.user_id] = t.bucket as TriageBucket;
    });
    setBuckets(map);
    setReps(
      ((profiles ?? []) as Rep[]).filter(p => p.user_id && p.user_id !== user?.id)
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const move = useCallback(
    async (userId: string, bucket: TriageBucket) => {
      const prev = buckets[userId];
      if (prev === bucket) return;
      setBuckets(b => ({ ...b, [userId]: bucket }));
      const { error } = await supabase.from('rep_triage').upsert(
        {
          user_id: userId,
          bucket,
          moved_by: user?.id ?? null,
          moved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        toast.error('Could not save that move');
        setBuckets(b => {
          const next = { ...b };
          if (prev) next[userId] = prev;
          else delete next[userId];
          return next;
        });
      }
    },
    [buckets, user?.id]
  );

  const unassigned = useMemo(() => reps.filter(r => !buckets[r.user_id]), [reps, buckets]);
  const byBucket = useMemo(() => {
    const out: Record<TriageBucket, Rep[]> = { promote: [], help: [], watch: [], cut: [] };
    reps.forEach(r => {
      const b = buckets[r.user_id];
      if (b) out[b].push(r);
    });
    return out;
  }, [reps, buckets]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const bucket = e.over?.id as TriageBucket | undefined;
    if (!bucket || !TRIAGE_BUCKETS.includes(bucket)) return;
    void move(String(e.active.id), bucket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRep = reps.find(r => r.user_id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TRIAGE_BUCKETS.map(b => (
            <Column key={b} bucket={b} reps={byBucket[b]} onMove={move} activeId={activeId} />
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-3">
          <div className="mb-2.5 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Unsorted</h3>
            <span className="ml-auto text-xs text-muted-foreground">{unassigned.length}</span>
          </div>
          {unassigned.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Everyone is sorted.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {unassigned.map(r => (
                <RepCard
                  key={r.user_id}
                  rep={r}
                  bucket={'watch'}
                  onMove={move}
                  dragging={activeId === r.user_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeRep && (
          <div className="rounded-xl border border-primary/40 bg-card px-3 py-2 text-sm text-foreground shadow-lg">
            {getDisplayName(activeRep.full_name)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
