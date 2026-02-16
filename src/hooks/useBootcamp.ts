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
  phase_2_video_url: string | null;
  phase_3_video_url: string | null;
  commitment_start_date: string | null;
  commitment_end_date: string | null;
  signature_name: string | null;
  signature_data: string | null;
}

export function useBootcamp() {
  const { user, role } = useAuth();
  const [progress, setProgress] = useState<BootcampProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Managers and admins bypass bootcamp
  const isBypassed = role === 'manager' || role === 'admin';

  const fetchProgress = useCallback(async () => {
    if (!user || isBypassed) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bootcamp_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching bootcamp progress:', error);
      setIsLoading(false);
      return;
    }

    if (!data) {
      // Create initial record
      const { data: newData, error: insertError } = await supabase
        .from('bootcamp_progress')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating bootcamp progress:', insertError);
      } else {
        setProgress(newData as BootcampProgress);
      }
    } else {
      setProgress(data as BootcampProgress);
    }

    setIsLoading(false);
  }, [user, isBypassed]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updatePhase = async (phase: 1 | 2 | 3, data: Partial<BootcampProgress>) => {
    if (!user || !progress) return false;

    const phaseKey = `phase_${phase}_complete` as keyof BootcampProgress;
    const updateData: Record<string, unknown> = { ...data, [phaseKey]: true };

    // Check if all phases will be complete
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

    await fetchProgress();
    return true;
  };

  const isLocked = !isBypassed && !isLoading && (!progress || !progress.bootcamp_completed);

  const currentPhase = !progress
    ? 0
    : !progress.phase_1_complete
    ? 1
    : !progress.phase_2_complete
    ? 2
    : !progress.phase_3_complete
    ? 3
    : 0; // all done

  return {
    progress,
    isLoading,
    isLocked,
    isBypassed,
    currentPhase,
    updatePhase,
    refetch: fetchProgress,
  };
}
