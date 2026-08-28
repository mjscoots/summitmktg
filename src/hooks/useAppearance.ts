import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getPreference,
  resolveMode,
  setPreferenceLocal,
  subscribeAppearance,
  type AppearanceMode,
  type AppearancePref,
} from '@/lib/appearance';

/** Reads the appearance preference and re-renders when it changes. */
export function useAppearance(): {
  preference: AppearancePref;
  mode: AppearanceMode;
  setPreference: (next: AppearancePref) => Promise<void>;
} {
  const [preference, setPref] = useState<AppearancePref>(getPreference());

  useEffect(() => subscribeAppearance(() => setPref(getPreference())), []);

  const setPreference = useCallback(async (next: AppearancePref) => {
    setPreferenceLocal(next);
    await supabase.rpc('set_appearance' as never, { _appearance: next } as never);
  }, []);

  return { preference, mode: resolveMode(preference), setPreference };
}

/**
 * Pulls the saved preference off the profile once per sign-in so the choice
 * follows the rep to a new device.
 */
export function useAppearanceSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('appearance')
        .eq('user_id', user.id)
        .maybeSingle();
      const remote = (data as { appearance?: string } | null)?.appearance;
      if (cancelled) return;
      if (remote === 'dark' || remote === 'light' || remote === 'system') setPreferenceLocal(remote);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
}
