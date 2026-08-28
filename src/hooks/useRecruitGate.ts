import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DayOneItem {
  position: number;
  video_id: string;
  title: string;
  category: string | null;
  video_url: string | null;
  done: boolean;
}

export interface RecruitGateState {
  locked: boolean;
  is_recruit: boolean;
  items: DayOneItem[];
  total: number;
  done: number;
  minutes: number;
}

const EMPTY: RecruitGateState = { locked: false, is_recruit: false, items: [], total: 0, done: 0, minutes: 0 };

/**
 * Pass 119 — the day-one watch course gate. Derived from the database on every
 * load: a recruit is locked only while onboarding is pending and the course is
 * unfinished. No local flags, no data rewrites.
 */
export function useRecruitGate() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<RecruitGateState>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user?.id) {
      setState(EMPTY);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await (supabase as any).rpc('recruit_gate_state');
      if (error) throw error;
      const next = (data || EMPTY) as RecruitGateState;
      setState({ ...EMPTY, ...next, items: next.items || [] });
    } catch {
      // Never trap someone behind a failed read.
      setState(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, isLoading, refresh: load };
}
