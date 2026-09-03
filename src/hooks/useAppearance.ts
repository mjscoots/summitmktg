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
import { setChatPrefsFromRow } from '@/lib/chatPrefs';


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
      // Pass 162 - the chat look row leaves with the appearance read, in
      // parallel, so a sign in still costs one wait.
      const [profileRes, prefsRes] = await Promise.all([
        (supabase as any).from('profiles').select('appearance').eq('user_id', user.id).maybeSingle(),
        (supabase as any)
          .from('chat_prefs')
          .select('wallpaper, wallpaper_path, bubble, text_size, room_overrides')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const remote = (profileRes.data as { appearance?: string } | null)?.appearance;
      if (remote === 'dark' || remote === 'light' || remote === 'system') setPreferenceLocal(remote);
      if (prefsRes.data) setChatPrefsFromRow(prefsRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
}

