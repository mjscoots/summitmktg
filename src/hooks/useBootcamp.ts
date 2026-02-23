import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BootcampProgress {
  id: string;
  user_id: string;
  phase_1_complete: boolean;
  phase_2_complete: boolean;
  phase_3_complete: boolean;
  bootcamp_completed: boolean;
  bootcamp_completed_at: string | null;
  sunblock_video_url: string | null;
  motivation_video_url: string | null;
  final_commitment_video_url: string | null;
  phase_2_video_url: string | null;
  phase_3_video_url: string | null;
  agreement_start_date: string | null;
  agreement_end_date: string | null;
  commitment_start_date: string | null;
  commitment_end_date: string | null;
  signature_name: string | null;
  signature_data: string | null;
  bootcamp_exempt: boolean;
}

export interface BootcampDeadlineInfo {
  deadlineHours: number;
  accountCreatedAt: string | null;
  deadlineAt: Date | null;
  hoursRemaining: number | null;
  isOverdue: boolean;
}

export function useBootcamp() {
  const { user, role } = useAuth();
  const [progress, setProgress] = useState<BootcampProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalRequired, setGlobalRequired] = useState(true);
  const [skipAllowed, setSkipAllowed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState<BootcampDeadlineInfo>({
    deadlineHours: 0.5,
    accountCreatedAt: null,
    deadlineAt: null,
    hoursRemaining: null,
    isOverdue: false,
  });

  const isBypassed = role === 'manager' || role === 'admin';

  const fetchProgress = useCallback(async () => {
    if (!user || isBypassed) {
      setIsLoading(false);
      return;
    }

    // Fetch global setting, deadline setting, user profile created_at, and progress in parallel
    const [settingsRes, deadlineRes, skipRes, profileRes, progressRes] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'bootcamp_required').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'bootcamp_deadline_hours').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'bootcamp_skip_allowed').maybeSingle(),
      supabase.from('profiles').select('created_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('bootcamp_progress').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    // Parse global setting
    if (settingsRes.data) {
      setGlobalRequired(settingsRes.data.value === 'true');
    } else {
      setGlobalRequired(true);
    }

    // Parse skip allowed setting
    setSkipAllowed(skipRes.data?.value === 'true');

    // Parse deadline setting
    const deadlineHours = deadlineRes.data ? parseFloat(deadlineRes.data.value || '0.5') : 0.5;
    const accountCreatedAt = profileRes.data?.created_at || null;
    let deadlineAt: Date | null = null;
    let hoursRemaining: number | null = null;
    let isOverdue = false;

    if (accountCreatedAt) {
      deadlineAt = new Date(new Date(accountCreatedAt).getTime() + deadlineHours * 60 * 60 * 1000);
      const now = new Date();
      const msRemaining = deadlineAt.getTime() - now.getTime();
      hoursRemaining = Math.max(0, msRemaining / (1000 * 60 * 60));
      isOverdue = msRemaining <= 0;
    }

    setDeadlineInfo({ deadlineHours, accountCreatedAt, deadlineAt, hoursRemaining, isOverdue });

    const data = progressRes.data;
    const error = progressRes.error;

    if (error) {
      console.error('Error fetching bootcamp progress:', error);
      setIsLoading(false);
      return;
    }

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('bootcamp_progress')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating bootcamp progress:', insertError);
      } else {
        setProgress(newData as unknown as BootcampProgress);
      }
    } else {
      setProgress(data as unknown as BootcampProgress);
    }

    setIsLoading(false);
  }, [user, isBypassed]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updatePhase = async (phase: 1 | 2 | 3, data: Record<string, unknown>) => {
    if (!user || !progress) return false;

    const phaseKey = `phase_${phase}_complete`;
    const updateData: Record<string, unknown> = { ...data, [phaseKey]: true };

    const willComplete =
      (phase === 1 || progress.phase_1_complete) &&
      (phase === 2 || progress.phase_2_complete) &&
      (phase === 3 || progress.phase_3_complete);

    if (willComplete) {
      updateData.bootcamp_completed = true;
      updateData.bootcamp_completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bootcamp_progress')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating bootcamp phase:', error);
      return false;
    }

    // Post bot shoutout when bootcamp is completed
    if (willComplete) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        if (prof?.full_name) {
          const { postBotShoutout } = await import('@/lib/botShoutout');
          postBotShoutout(user.id, prof.full_name, 'bootcamp');
        }
      } catch { /* non-critical */ }
    }

    await fetchProgress();
    return true;
  };

  const isExempt = progress?.bootcamp_exempt === true;
  const isLocked = !isBypassed && globalRequired && !isExempt && !skipped && !isLoading && (!progress || !progress.bootcamp_completed);

  const currentPhase = !progress
    ? 0
    : !progress.phase_1_complete
    ? 1
    : !progress.phase_2_complete
    ? 2
    : !progress.phase_3_complete
    ? 3
    : 0;

  const skipBootcamp = () => setSkipped(true);

  return {
    progress,
    isLoading,
    isLocked,
    isBypassed,
    currentPhase,
    updatePhase,
    refetch: fetchProgress,
    deadlineInfo,
    skipAllowed,
    skipBootcamp,
  };
}
