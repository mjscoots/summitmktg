import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { detectBrowserTimezone } from '@/lib/timezones';

/**
 * Hook to get the user's timezone, auto-detected from browser location.
 * Automatically syncs detected timezone to the user's profile.
 */
export function useUserTimezone() {
  const { user } = useAuth();
  const detectedTz = detectBrowserTimezone();
  const [timezone, setTimezone] = useState(detectedTz);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setTimezone(detectedTz);
      setIsLoaded(true);
      return;
    }

    // Always use the browser-detected timezone and sync it to the profile
    setTimezone(detectedTz);
    setIsLoaded(true);

    // Sync to profile in background (fire-and-forget)
    const syncTimezone = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .single();

        const currentTz = (data as any)?.timezone;
        if (currentTz !== detectedTz) {
          await supabase
            .from('profiles')
            .update({ timezone: detectedTz })
            .eq('user_id', user.id);
        }
      } catch {
        // Silent fail
      }
    };

    syncTimezone();
  }, [user, detectedTz]);

  return { timezone, isLoaded };
}
