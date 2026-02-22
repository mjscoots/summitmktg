import { useState, useEffect } from 'react';
import { usePersonalTrainingProgress } from './usePersonalTrainingProgress';
import { useStreak } from './useStreak';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTierForPercentage } from '@/components/shared/TierBadge';

export function useEliteTier(userId?: string) {
  const { progress } = usePersonalTrainingProgress();
  const { streakData } = useStreak();
  const { user } = useAuth();
  const [bootcampPct, setBootcampPct] = useState(0);
  const [formsPct, setFormsPct] = useState(0);

  const targetId = userId || user?.id;

  useEffect(() => {
    const fetch = async () => {
      if (!targetId) return;
      const [bp, fp] = await Promise.all([
        supabase.from('bootcamp_progress').select('phase_1_complete, phase_2_complete, phase_3_complete, bootcamp_completed').eq('user_id', targetId).maybeSingle(),
        supabase.from('user_priority_tasks').select('id, is_completed').eq('user_id', targetId).eq('is_active', true),
      ]);
      if (bp.data) {
        if (bp.data.bootcamp_completed) setBootcampPct(100);
        else {
          const phases = [bp.data.phase_1_complete, bp.data.phase_2_complete, bp.data.phase_3_complete].filter(Boolean).length;
          setBootcampPct(Math.round((phases / 3) * 100));
        }
      }
      const tasks = fp.data || [];
      setFormsPct(tasks.length > 0 ? Math.round(tasks.filter(t => t.is_completed).length / tasks.length * 100) : 100);
    };
    fetch();
  }, [targetId]);

  const streakPct = Math.min(streakData.currentStreak * 10, 100);
  const systemPct = Math.round(
    progress.overall * 0.50 +
    bootcampPct * 0.20 +
    formsPct * 0.15 +
    streakPct * 0.15
  );

  const tier = getTierForPercentage(systemPct);

  return { systemPct, tier, tierName: tier?.name || null };
}
