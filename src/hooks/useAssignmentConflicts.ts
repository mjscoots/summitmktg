import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AssignmentConflict {
  id: string;
  user_id: string;
  conflict_type: 'manager_conflict' | 'needs_manager' | 'missing_team';
  old_manager_id: string | null;
  new_manager_id: string | null;
  old_team_id: string | null;
  new_team_id: string | null;
  resolved: boolean;
  created_at: string;
  notes: string | null;
  // Joined
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
  team_name?: string | null;
  direct_manager?: string | null;
  status?: string | null;
}

export function useAssignmentConflicts() {
  const { role } = useAuth();
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'owner';

  const fetchConflicts = useCallback(async () => {
    if (!isAdmin) { setIsLoading(false); return; }
    setIsLoading(true);

    const { data, error } = await supabase
      .from('assignment_conflicts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conflicts:', error);
      setIsLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setConflicts([]);
      setIsLoading(false);
      return;
    }

    // Enrich with profile data
    const userIds = data.map(c => c.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url, team_id, direct_manager, status')
      .in('user_id', userIds);

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name');

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const teamMap = new Map((teams || []).map(t => [t.id, t.name]));

    const enriched = data.map(c => {
      const p = profileMap.get(c.user_id);
      return {
        ...c,
        conflict_type: c.conflict_type as AssignmentConflict['conflict_type'],
        full_name: p?.full_name || 'Unknown',
        email: p?.email || '',
        avatar_url: p?.avatar_url,
        team_name: p?.team_id ? teamMap.get(p.team_id) || null : null,
        direct_manager: p?.direct_manager,
        status: p?.status as string | null,
      };
    });

    setConflicts(enriched);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  const resolveConflict = async (conflictId: string) => {
    await supabase
      .from('assignment_conflicts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', conflictId);
    fetchConflicts();
  };

  return { conflicts, isLoading, refetch: fetchConflicts, resolveConflict };
}
