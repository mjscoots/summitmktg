import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePendingRSVP } from '@/hooks/usePendingRSVP';

function mondayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** One quiet line of the rep's own week. No comparison to anyone else. */
export function YourWeekLine() {
  const { user } = useAuth();
  const pendingRSVP = usePendingRSVP();
  const [sales, setSales] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const monday = mondayISO();
    const [salesRes, timeRes] = await Promise.all([
      (supabase as any)
        .from('sales_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('sold_at', monday),
      supabase
        .from('daily_training_time')
        .select('training_minutes')
        .eq('user_id', user.id)
        .gte('date', monday.slice(0, 10)),
    ]);
    setSales((salesRes as { count: number | null }).count || 0);
    setMinutes(
      ((timeRes.data as { training_minutes: number | null }[]) || []).reduce(
        (a, r) => a + (r.training_minutes || 0),
        0
      )
    );
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <p className="text-[13px] text-muted-foreground">
      Your week: <span className="tabular-nums text-foreground">{sales}</span> sales ·{' '}
      <span className="tabular-nums text-foreground">{minutes}</span> training minutes ·{' '}
      {pendingRSVP > 0 ? (
        <span className="text-foreground">
          {pendingRSVP} event {pendingRSVP === 1 ? 'answer' : 'answers'} needed
        </span>
      ) : (
        'no event answers needed'
      )}
    </p>
  );
}
