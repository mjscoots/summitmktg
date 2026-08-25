import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Wifi } from 'lucide-react';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface WeekRow {
  week_start: string;
  installs: number;
  cancels: number;
  carrier_id: string;
}

/** A rep's own fiber weeks. Blank until someone enters the numbers. */
export function MyFiberWeeks() {
  const { user } = useAuth();
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [carriers, setCarriers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [f, c] = await Promise.all([
        supabase
          .from('fiber_installs')
          .select('week_start, installs, cancels, carrier_id')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(12),
        supabase.from('carriers').select('id, name'),
      ]);
      setRows((f.data as WeekRow[]) ?? []);
      const map: Record<string, string> = {};
      (c.data ?? []).forEach((row: any) => { map[row.id] = row.name; });
      setCarriers(map);
      setLoaded(true);
    })();
  }, [user?.id]);

  if (!loaded || rows.length === 0) return null;

  return (
    <section className={CARD}>
      <div className="mb-2 flex items-center gap-2">
        <Wifi className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Fiber weeks</h2>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {rows.map((r) => {
          const rate = r.installs > 0 && r.cancels > 0 ? (r.cancels / r.installs) * 100 : null;
          return (
            <div key={`${r.week_start}-${r.carrier_id}`} className="flex items-center gap-3 py-2 text-xs">
              <span className="text-foreground tabular-nums">{r.week_start}</span>
              <span className="text-muted-foreground">{carriers[r.carrier_id] ?? '—'}</span>
              <span className="ml-auto tabular-nums text-foreground">{r.installs} installs</span>
              <span className="tabular-nums text-muted-foreground">{r.cancels} cancels</span>
              {rate !== null && (
                <span className="tabular-nums text-muted-foreground">{rate.toFixed(0)}% cancel rate</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default MyFiberWeeks;
