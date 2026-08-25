import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VerticalLeadState {
  loading: boolean;
  /** The vertical this user leads, or null when they lead none. */
  vertical: string | null;
}

/** Resolves whether the signed-in user is the lead of an industry vertical. */
export function useVerticalLead(): VerticalLeadState {
  const { user } = useAuth();
  const [state, setState] = useState<VerticalLeadState>({ loading: true, vertical: null });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ loading: false, vertical: null });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('vertical, runs_vertical, archived')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { vertical: string | null; runs_vertical: boolean | null; archived: boolean | null } | null;
      const isLead = !!row?.runs_vertical && !row?.archived;
      setState({ loading: false, vertical: isLead ? row?.vertical ?? null : null });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
