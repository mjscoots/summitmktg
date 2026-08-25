import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActionItems } from '@/hooks/useActionItems';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { Car, Check, ListChecks } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Today's car + driver for the signed-in rep. Renders nothing when unassigned. */
export function MyCarTodayCard() {
  const { user } = useAuth();
  const [car, setCar] = useState<{ car_name: string; driver: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: seats } = await supabase
        .from('car_group_members')
        .select('car_group_id')
        .eq('user_id', user.id);
      const ids = (seats ?? []).map(s => s.car_group_id);
      if (!ids.length) return;
      const { data: groups } = await supabase
        .from('car_groups')
        .select('car_name, driver_user_id, driver_name, published, group_date')
        .in('id', ids)
        .eq('group_date', todayISO())
        .eq('published', true)
        .limit(1);
      const g = groups?.[0];
      if (!g || cancelled) return;
      let driver = g.driver_name ?? '';
      if (g.driver_user_id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', g.driver_user_id)
          .maybeSingle();
        if (p?.full_name) driver = getDisplayName(p.full_name);
      }
      if (!cancelled) setCar({ car_name: g.car_name, driver: driver || 'TBD' });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!car) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-card/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5">
        <Car className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Today's car: {car.car_name}</p>
        <p className="text-xs text-muted-foreground">Driver: {car.driver}</p>
      </div>
    </div>
  );
}

/** Compact open-action-items card. Renders nothing when the user has none. */
export function MyActionItemsCard({ className }: { className?: string }) {
  const { items, loading, complete } = useActionItems();
  const today = todayISO();

  if (loading || items.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-card/60 p-4 backdrop-blur-sm',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5">
          <ListChecks className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">My action items</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} open</span>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 6).map(i => {
          const overdue = i.due_date && i.due_date < today;
          return (
            <li key={i.id} className="flex items-center gap-2.5">
              <button
                onClick={() => complete(i.id)}
                aria-label={`Mark "${i.title}" done`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{i.title}</span>
              {i.due_date && (
                <span
                  className={cn(
                    'shrink-0 text-[11px]',
                    overdue ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {overdue ? 'Overdue' : i.due_date.slice(5)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
