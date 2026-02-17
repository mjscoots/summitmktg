import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_TIMEZONE, detectBrowserTimezone } from '@/lib/timezones';

/**
 * Hook to get the user's timezone from their profile.
 * Falls back to browser timezone detection, then Pacific.
 */
export function useUserTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState(detectBrowserTimezone());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchTimezone = async () => {
      if (!user) {
        setIsLoaded(true);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .single();
        
        const tz = (data as any)?.timezone;
        if (tz) setTimezone(tz);
      } catch {
        // Use default
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTimezone();
  }, [user]);

  return { timezone, isLoaded };
}
