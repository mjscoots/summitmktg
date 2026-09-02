import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TrainingWeek {
  minutes: number;
  daysTrained: number;
  daysElapsed: number;
  streak: number;
  isLoading: boolean;
}

function mondayDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Pass 101 - the shape of the rep's training week. Real numbers only:
 * minutes logged, days trained out of days elapsed, and the login streak.
 */
export function useTrainingWeek(): TrainingWeek {
  const { user } = useAuth();
  const [state, setState] = useState<TrainingWeek>({
    minutes: 0,
    daysTrained: 0,
    daysElapsed: 1,
    streak: 0,
    isLoading: true,
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const monday = mondayDate();
    const daysElapsed = Math.min(7, ((new Date().getDay() + 6) % 7) + 1);

    const [timeRes, streakRes] = await Promise.all([
      supabase
        .from('daily_training_time')
        .select('date, training_minutes')
        .eq('user_id', user.id)
        .gte('date', monday.toISOString().slice(0, 10)),
      supabase
        .from('daily_login_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const rows = (timeRes.data as { date: string; training_minutes: number | null }[]) || [];
    const minutes = rows.reduce((a, r) => a + (r.training_minutes || 0), 0);
    const daysTrained = new Set(rows.filter((r) => (r.training_minutes || 0) > 0).map((r) => r.date)).size;

    setState({
      minutes,
      daysTrained,
      daysElapsed,
      streak: (streakRes.data as { current_streak: number } | null)?.current_streak ?? 0,
      isLoading: false,
    });
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
