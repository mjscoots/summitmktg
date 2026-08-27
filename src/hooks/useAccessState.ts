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

/** Cached per signed-in person, so a different account never reads the last one's access. */
let cached: { userId: string; state: AccessState } | null = null;

/**
 * Server-side truth about whether the signed-in person may use the app.
 * Loaded once per signed-in person, not per screen.
 */
export function useAccessState(enabled: boolean) {
  const [state, setState] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (cancelled) return;
      if (!uid) {
        setState(null);
        setLoading(false);
        return;
      }
      if (cached && cached.userId === uid) {
        setState(cached.state);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc('get_my_access_state');
      if (cancelled) return;
      if (data) {
        cached = { userId: uid, state: data as unknown as AccessState };
        setState(cached.state);
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
