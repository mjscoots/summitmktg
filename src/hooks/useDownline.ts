import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DownlineMember {
  profile_id?: string;
  user_id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  role?: string;
  direct_manager?: string | null;
  team_name?: string | null;
  status?: string | null;
  last_active_at?: string | null;
  is_active_now?: boolean | null;
  time_this_week_minutes?: number;
  depth?: number;
}

/**
 * Shared hook for fetching a manager's downline.
 * Uses edge-based lookup first, falls back to text-based.
 * Eliminates duplicated fetch logic across 6+ components.
 */
export function useDownline(userId: string | undefined, managerName: string | undefined) {
  const [downline, setDownline] = useState<DownlineMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !managerName) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDownline = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try edge-based downline first
        const { data: edgeData, error: edgeErr } = await supabase.rpc(
          'get_downline_from_edges',
          { _manager_user_id: userId }
        );

        // Filter out NLC and Prospect Added — they don't exist in operational views
        const filterActive = (members: DownlineMember[]) =>
          members.filter(m => m.status !== 'nlc' && m.status !== 'prospect_added');

        if (!edgeErr && edgeData && edgeData.length > 0) {
          if (!cancelled) setDownline(filterActive(edgeData as DownlineMember[]));
        } else {
          // Fall back to text-based
          const { data: textData, error: textErr } = await supabase.rpc(
            'get_user_downline',
            { _manager_name: managerName }
          );

          if (textErr) throw textErr;
          if (!cancelled) setDownline(filterActive((textData || []) as DownlineMember[]));
        }
      } catch (err: any) {
        console.error('useDownline error:', err);
        if (!cancelled) setError(err?.message || 'Failed to load downline');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchDownline();
    return () => { cancelled = true; };
  }, [userId, managerName]);

  return { downline, isLoading, error };
}
