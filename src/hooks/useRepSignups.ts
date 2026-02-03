import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek } from 'date-fns';

interface RepSignup {
  id: string;
  rep_name: string;
  signed_at: string;
  signed_by: string | null;
  source: string | null;
}

export function useRepSignups() {
  const [signedThisWeek, setSignedThisWeek] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const now = new Date();
      // Week starts on Monday
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const { count, error } = await supabase
        .from('rep_signups')
        .select('*', { count: 'exact', head: true })
        .gte('signed_at', weekStart.toISOString())
        .lte('signed_at', weekEnd.toISOString());

      if (error) throw error;
      setSignedThisWeek(count || 0);
    } catch (err) {
      console.error('Error fetching rep signups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('rep_signups_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rep_signups',
        },
        () => {
          // Refetch count on new signup
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { signedThisWeek, isLoading, refetch: fetchCount };
}