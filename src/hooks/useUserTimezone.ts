import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { detectBrowserTimezone } from '@/lib/timezones';

/**
 * Hook to get the user's timezone.
 * - If the user has a timezone set in their profile, use that (manual override).
 * - If the profile timezone is null, auto-detect from browser and use that (but don't save it).
 * This allows users to override via profile settings, while defaulting to auto-detect.
 */
export function useUserTimezone() {
  const { user } = useAuth();
  const detectedTz = detectBrowserTimezone();
  const [timezone, setTimezone] = useState(detectedTz);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(true);

  useEffect(() => {
    if (!user) {
      setTimezone(detectedTz);
      setIsAutoDetected(true);
      setIsLoaded(true);
      return;
    }

    const loadTimezone = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .single();

        const dbTimezone = (data as any)?.timezone;

        if (dbTimezone) {
          // User has manually set a timezone — use it
          setTimezone(dbTimezone);
          setIsAutoDetected(false);
        } else {
          // No timezone set — auto-detect from browser
          setTimezone(detectedTz);
          setIsAutoDetected(true);
        }
      } catch {
        setTimezone(detectedTz);
        setIsAutoDetected(true);
      }
      setIsLoaded(true);
    };

    loadTimezone();
  }, [user, detectedTz]);

  return { timezone, isLoaded, isAutoDetected };
}
