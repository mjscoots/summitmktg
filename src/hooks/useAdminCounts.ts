import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getCanonicalName,
  getEffectiveManager,
  normalizeName,
  PILLAR_OWNERS,
  isTopAdmin,
  namesMatch,
} from '@/lib/hierarchyUtils';

export interface AdminCounts {
  pendingApprovals: number;
  pendingPitches: number;
  newFeedback: number;
  syncIssues: number;
  total: number;
}

/**
 * Single source of truth for admin notification counts.
 * Every count is derived from the SAME query the admin UI uses.
 * If the system can't confidently determine a count, it defaults to 0.
 */
export function useAdminCounts() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<AdminCounts>({
    pendingApprovals: 0,
    pendingPitches: 0,
    newFeedback: 0,
    syncIssues: 0,
    total: 0,
  });
  const mountedRef = useRef(true);

  const isAdmin = role === 'admin' || role === 'owner';

  const fetchCounts = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const [profilesRes, rolesRes, pitchesRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, status, approved, onboarding_status, direct_manager, recruiter, team_id'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('pitch_approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        (supabase.from('app_feedback' as any) as any).select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      if (!mountedRef.current) return;

      // === PENDING APPROVALS ===
      // Same filter as AdminTeamPage: status=pending, approved=false, no onboarding_status (real signups, not imports)
      const profiles = profilesRes.data || [];
      const pendingApprovals = profiles.filter(
        (p: any) => p.status === 'pending' && !p.approved && !p.onboarding_status
      ).length;

      // === PENDING PITCHES ===
      const pendingPitches = pitchesRes.count || 0;

      // === NEW FEEDBACK ===
      const newFeedback = feedbackRes.count || 0;

      // === SYNC ISSUES ===
      // Same logic as HierarchySyncTab: count unresolved hierarchy issues
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
      const managerRoles = new Set(['manager', 'admin', 'owner']);
      const managers = profiles.filter((p: any) => managerRoles.has(roleMap.get(p.user_id) || ''));
      
      let syncIssues = 0;
      for (const p of profiles) {
        const pRole = roleMap.get(p.user_id);
        // Skip inactive
        if (p.status === 'nlc' || p.status === 'pending') continue;
        // Skip root admin
        if (isTopAdmin(p.full_name)) continue;
        // Skip pillar owners
        const canonical = getCanonicalName(p.full_name);
        if (Object.values(PILLAR_OWNERS).some((o) => namesMatch(canonical, o))) continue;

        const rawManager = p.direct_manager || p.recruiter;
        const effectiveManager = rawManager ? getEffectiveManager(rawManager) : null;

        if (!effectiveManager) {
          syncIssues++;
          continue;
        }

        // Check if manager exists
        const managerExists = profiles.some(
          (m: any) => normalizeName(getCanonicalName(m.full_name)) === normalizeName(effectiveManager)
        );
        const managerIsKnownPillarOwner = Object.values(PILLAR_OWNERS).some((o) =>
          namesMatch(effectiveManager, o)
        );

        if (!managerExists && !managerIsKnownPillarOwner && !isTopAdmin(effectiveManager)) {
          syncIssues++;
        }
      }

      const total = pendingApprovals + pendingPitches + newFeedback + syncIssues;

      setCounts({ pendingApprovals, pendingPitches, newFeedback, syncIssues, total });
    } catch {
      // On error, default to 0 — do NOT guess
      if (mountedRef.current) {
        setCounts({ pendingApprovals: 0, pendingPitches: 0, newFeedback: 0, syncIssues: 0, total: 0 });
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAdmin) return;

    fetchCounts();

    const channel = supabase
      .channel('admin-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_approval_requests' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () => fetchCounts())
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchCounts]);

  return counts;
}
