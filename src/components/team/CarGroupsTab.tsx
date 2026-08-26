import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { Car, GripVertical, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Rep {
  user_id: string;
  full_name: string;
}

interface CarGroup {
  id: string;
  group_date: string;
  car_name: string;
  driver_user_id: string | null;
  driver_name: string | null;
  published: boolean;
}

interface Seat {
  id: string;
  car_group_id: string;
  user_id: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function SeatChip({ rep, onRemove }: { rep: Rep; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: rep.user_id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5',
        isDragging && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${getDisplayName(rep.full_name)}`}
        className="touch-none text-muted-foreground/60"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
        {getDisplayName(rep.full_name)}
      </span>
      <button onClick={onRemove} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CarColumn({
  car,
  seats,
  reps,
  onRemoveSeat,
  onPublish,
  onDelete,
}: {
  car: CarGroup;
  seats: Seat[];
  reps: Rep[];
  onRemoveSeat: (seatId: string) => void;
  onPublish: (car: CarGroup) => void;
  onDelete: (car: CarGroup) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `car:${car.id}` });
  const repFor = (id: string) => reps.find(r => r.user_id === id);
  const driver = car.driver_user_id ? repFor(car.driver_user_id) : null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-card/60 p-3 backdrop-blur-sm transition-colors',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/25">
          <Car className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{car.car_name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Driver: {driver ? getDisplayName(driver.full_name) : car.driver_name || 'unassigned'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px]',
            car.published
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground'
          )}
        >
          {car.published ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="space-y-1.5">
        {seats.map(s => {
          const rep = repFor(s.user_id);
          if (!rep) return null;
          return <SeatChip key={s.id} rep={rep} onRemove={() => onRemoveSeat(s.id)} />;
        })}
        {seats.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/[0.06] px-2 py-3 text-center text-[11px] text-muted-foreground">
            Drop reps here
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {!car.published && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onPublish(car)}>
            <Send className="mr-1 h-3.5 w-3.5" /> Publish
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => onDelete(car)} aria-label="Delete car">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Car groups for a date — managers+ only. Published cars show on the rep's Home. */
export function CarGroupsTab() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [reps, setReps] = useState<Rep[]>([]);
  const [cars, setCars] = useState<CarGroup[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDriver, setNewDriver] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: carRows }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').eq('archived', false).order('full_name'),
      supabase.from('car_groups').select('*').eq('group_date', date).order('created_at'),
    ]);
    setReps((profiles ?? []) as Rep[]);
    const list = (carRows ?? []) as CarGroup[];
    setCars(list);
    if (list.length) {
      const { data: seatRows } = await supabase
        .from('car_group_members')
        .select('id, car_group_id, user_id')
        .in('car_group_id', list.map(c => c.id));
      setSeats((seatRows ?? []) as Seat[]);
    } else {
      setSeats([]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignedIds = useMemo(() => new Set(seats.map(s => s.user_id)), [seats]);
  const available = useMemo(() => reps.filter(r => !assignedIds.has(r.user_id)), [reps, assignedIds]);

  const addCar = async () => {
    if (!newName.trim()) {
      toast.error('Name the car first');
      return;
    }
    const { error } = await supabase.from('car_groups').insert({
      group_date: date,
      car_name: newName.trim(),
      driver_user_id: newDriver || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error('Could not create that car');
      return;
    }
    setNewName('');
    setNewDriver('');
    await load();
  };

  const assign = async (userId: string, carId: string) => {
    const existing = seats.find(s => s.user_id === userId);
    if (existing?.car_group_id === carId) return;
    if (existing) await supabase.from('car_group_members').delete().eq('id', existing.id);
    const { error } = await supabase
      .from('car_group_members')
      .insert({ car_group_id: carId, user_id: userId });
    if (error) toast.error('Could not assign that rep');
    await load();
  };

  const removeSeat = async (seatId: string) => {
    setSeats(prev => prev.filter(s => s.id !== seatId));
    await supabase.from('car_group_members').delete().eq('id', seatId);
  };

  const publish = async (car: CarGroup) => {
    const { error } = await supabase.from('car_groups').update({ published: true }).eq('id', car.id);
    if (error) {
      toast.error('Could not publish');
      return;
    }
    toast.success(`${car.car_name} published`);
    await load();
  };

  const removeCar = async (car: CarGroup) => {
    await supabase.from('car_groups').delete().eq('id', car.id);
    await load();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const over = String(e.over?.id ?? '');
    if (!over.startsWith('car:')) return;
    void assign(String(e.active.id), over.slice(4));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-card/60 p-3 backdrop-blur-sm sm:flex-row sm:items-center">
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="sm:max-w-[170px]"
          />
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Car name"
            className="flex-1"
          />
          <select
            value={newDriver}
            onChange={e => setNewDriver(e.target.value)}
            className="min-h-10 rounded-md border border-white/[0.08] bg-card/50 px-3 text-sm text-foreground sm:max-w-[190px]"
          >
            <option value="">Driver (optional)</option>
            {reps.map(r => (
              <option key={r.user_id} value={r.user_id}>
                {getDisplayName(r.full_name)}
              </option>
            ))}
          </select>
          <Button onClick={addCar} variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add car
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cars.map(c => (
                <CarColumn
                  key={c.id}
                  car={c}
                  seats={seats.filter(s => s.car_group_id === c.id)}
                  reps={reps}
                  onRemoveSeat={removeSeat}
                  onPublish={publish}
                  onDelete={removeCar}
                />
              ))}
              {cars.length === 0 && (
                <p className="col-span-full rounded-2xl border border-dashed border-white/[0.06] px-4 py-10 text-center text-sm text-muted-foreground">
                  No cars for this date yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Unassigned reps</h3>
                <span className="ml-auto text-xs text-muted-foreground">{available.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {available.map(r => (
                  <UnassignedChip key={r.user_id} rep={r} cars={cars} onAssign={assign} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DndContext>
  );
}

function UnassignedChip({
  rep,
  cars,
  onAssign,
}: {
  rep: Rep;
  cars: CarGroup[];
  onAssign: (userId: string, carId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: rep.user_id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-card/60 px-2 py-1.5',
        isDragging && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${getDisplayName(rep.full_name)}`}
        className="touch-none text-muted-foreground/60"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
        {getDisplayName(rep.full_name)}
      </span>
      {cars.length > 0 && (
        <select
          value=""
          onChange={e => e.target.value && onAssign(rep.user_id, e.target.value)}
          aria-label="Assign to car"
          className="max-w-[70px] rounded-md border border-white/[0.08] bg-background/60 px-1 py-0.5 text-[10px] text-muted-foreground"
        >
          <option value="">Car…</option>
          {cars.map(c => (
            <option key={c.id} value={c.id}>
              {c.car_name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
