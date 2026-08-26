import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccessState {
  archived: boolean;
  alumni: boolean;
  approved: boolean;
  has_role: boolean;
  in_reset: boolean;
  reset_reason: string | null;
  request_status: string | null;
}

let cached: AccessState | null = null;

/**
 * Server-side truth about whether the signed-in person may use the app.
 * Loaded once per session, not per screen.
 */
export function useAccessState(enabled: boolean) {
  const [state, setState] = useState<AccessState | null>(cached);
  const [loading, setLoading] = useState(!cached && enabled);

  useEffect(() => {
    if (!enabled || cached) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc('get_my_access_state');
      if (cancelled) return;
      if (data) {
        cached = data as unknown as AccessState;
        setState(cached);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { state, loading };
}

export function clearAccessStateCache() {
  cached = null;
}
