import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Carrier {
  id: string;
  name: string;
}

/** Monday of the week the given date falls in. */
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Today as a plain date string in the rep's own timezone. */
export function todayStr(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

interface DayRow {
  day: string;
  sold: number;
  carrier_id: string | null;
  note: string | null;
}

/**
 * Pass 92 - today's numbers. Reps answer "how many today", so this reads the
 * day rows and rolls up today and this week from the same data.
 */
export function useFiberToday() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const [myDay, setMyDay] = useState<DayRow | null>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [lastCarrierId, setLastCarrierId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const d = todayStr();
    const monday = mondayOf(d);
    const [dayRes, carrierRes, lastRes] = await Promise.all([
      (supabase as any)
        .from('fiber_day_numbers')
        .select('day, sold, carrier_id, note')
        .eq('user_id', user.id)
        .gte('day', monday)
        .order('day'),
      (supabase as any).from('carriers').select('id, name').order('name'),
      (supabase as any)
        .from('fiber_day_numbers')
        .select('carrier_id')
        .eq('user_id', user.id)
        .not('carrier_id', 'is', null)
        .order('day', { ascending: false })
        .limit(1),
    ]);
    const rows = (dayRes.data as DayRow[]) || [];
    setWeek(rows.reduce((a, r) => a + (r.sold || 0), 0));
    const mine = rows.find((r) => r.day === d) || null;
    setMyDay(mine);
    setToday(mine?.sold || 0);
    setCarriers((carrierRes.data as Carrier[]) || []);
    setLastCarrierId(
      mine?.carrier_id || ((lastRes.data as { carrier_id: string }[]) || [])[0]?.carrier_id || null
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, today, week, myDay, carriers, lastCarrierId, reload: load };
}
