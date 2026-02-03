import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useManagerNotifications() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    if (!isManager) return;

    // Subscribe to new rep signups for toast notifications
    const channel = supabase
      .channel('manager_rep_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rep_signups',
        },
        async (payload) => {
          const signup = payload.new as {
            rep_name: string;
            signed_by: string | null;
          };

          // Get manager name who signed
          let managerName = 'A manager';
          if (signup.signed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', signup.signed_by)
              .single();

            if (profile) {
              managerName = profile.full_name;
            }
          }

          // Show toast notification
          toast.success(`${managerName} signed a rep!`, {
            description: signup.rep_name,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isManager]);
}