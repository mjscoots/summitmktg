import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Who may edit Fiber content. Decided by the database fiber_editors list, not
 * by the admin role, and enforced server side on every write.
 */
export function useFiberEditor() {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCanEdit(false);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any).rpc('is_fiber_editor', { _uid: user.id });
      if (!active) return;
      setCanEdit(data === true);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return { canEdit, loading };
}
