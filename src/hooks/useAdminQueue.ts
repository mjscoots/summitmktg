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

export type QueueItemType = 'approval' | 'pitch' | 'feedback' | 'sync';

export interface QueueItem {
  /** Stable dismissal key: `${type}:${id}` */
  key: string;
  type: QueueItemType;
  id: string;
  title: string;
  subtitle: string;
  createdAt: string | null;
  /** Extra context used by the action handlers */
  meta?: Record<string, unknown>;
}

export interface QueueCounts {
  pendingApprovals: number;
  pendingPitches: number;
  newFeedback: number;
  syncIssues: number;
  total: number;
}

export const STALE_DAYS = 30;

export function itemAgeDays(item: QueueItem): number {
  if (!item.createdAt) return 0;
  const ms = Date.now() - new Date(item.createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function isStale(item: QueueItem): boolean {
  return itemAgeDays(item) >= STALE_DAYS;
}

const EMPTY_COUNTS: QueueCounts = {
  pendingApprovals: 0,
  pendingPitches: 0,
  newFeedback: 0,
  syncIssues: 0,
  total: 0,
};

function isFakeProfile(p: any) {
  const n = (p.full_name || '').toLowerCase().trim();
  const e = (p.email || '').toLowerCase();
  if (['new user', 'test user', 'test', 'admin'].includes(n)) return true;
  if (
    e.includes('example.invalid') ||
    e.includes('poc-') ||
    e.includes('inject') ||
    e.includes('xss') ||
    e.includes('sqli') ||
    e.includes('rce') ||
    e.includes('bypass')
  )
    return true;
  return false;
}

/**
 * SINGLE SOURCE OF TRUTH for the admin queue.
 * Builds the full item list (approvals, pitches, feedback, hierarchy sync issues),
 * excludes anything an admin has dismissed, and derives the badge counts from
 * that exact same list — so the sidebar badge, the Home queue pulse and the
 * triage view can never disagree.
 */
export function useAdminQueue() {
  const { role, user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const isAdmin = role === 'admin' || role === 'owner';

  const fetchQueue = useCallback(async () => {
    if (!isAdmin) {
      setItems([]);
      setCounts(EMPTY_COUNTS);
      setIsLoading(false);
      return;
    }

    try {
      const [profilesRes, rolesRes, pitchesRes, feedbackRes, dismissedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, user_id, full_name, status, approved, onboarding_status, direct_manager, recruiter, team_id, created_at'
          ),
        supabase.from('user_roles').select('user_id, role'),
        supabase
          .from('pitch_approval_requests')
          .select('id, user_id, lesson_id, submitted_at, video_url')
          .eq('status', 'pending'),
        (supabase.from('app_feedback' as any) as any)
          .select('id, user_id, feedback_type, message, created_at')
          .eq('status', 'new'),
        (supabase.from('admin_queue_dismissals' as any) as any).select('item_type, item_key'),
      ]);

      if (!mountedRef.current) return;

      const dismissed = new Set(
        ((dismissedRes.data as any[]) || []).map((d) => `${d.item_type}:${d.item_key}`)
      );

      const profiles = (profilesRes.data as any[]) || [];
      const nameByUser = new Map(profiles.map((p) => [p.user_id, p.full_name]));

      const next: QueueItem[] = [];

      // === PENDING APPROVALS ===
      profiles
        .filter((p) => p.approved === false && p.status !== 'rejected' && !isFakeProfile(p))
        .forEach((p) => {
          next.push({
            key: `approval:${p.id}`,
            type: 'approval',
            id: p.id,
            title: p.full_name || 'Unnamed rep',
            subtitle: p.direct_manager ? `Manager: ${p.direct_manager}` : 'No manager assigned',
            createdAt: p.created_at || null,
            meta: { userId: p.user_id },
          });
        });

      // === PENDING PITCHES ===
      ((pitchesRes.data as any[]) || []).forEach((r) => {
        next.push({
          key: `pitch:${r.id}`,
          type: 'pitch',
          id: r.id,
          title: nameByUser.get(r.user_id) || 'Pitch submission',
          subtitle: 'Awaiting pitch review',
          createdAt: r.submitted_at || null,
          meta: { userId: r.user_id, lessonId: r.lesson_id },
        });
      });

      // === NEW FEEDBACK ===
      ((feedbackRes.data as any[]) || []).forEach((f) => {
        next.push({
          key: `feedback:${f.id}`,
          type: 'feedback',
          id: f.id,
          title: nameByUser.get(f.user_id) || 'Anonymous',
          subtitle: (f.message || '').slice(0, 120) || f.feedback_type || 'Feedback',
          createdAt: f.created_at || null,
        });
      });

      // === HIERARCHY SYNC ISSUES ===
      const roleMap = new Map(((rolesRes.data as any[]) || []).map((r) => [r.user_id, r.role]));
      for (const p of profiles) {
        if (p.status === 'nlc' || p.status === 'pending') continue;
        if (isTopAdmin(p.full_name)) continue;
        const canonical = getCanonicalName(p.full_name);
        if (Object.values(PILLAR_OWNERS).some((o) => namesMatch(canonical, o))) continue;

        const rawManager = p.direct_manager || p.recruiter;
        const effectiveManager = rawManager ? getEffectiveManager(rawManager) : null;

        if (!effectiveManager) {
          next.push({
            key: `sync:${p.id}`,
            type: 'sync',
            id: p.id,
            title: p.full_name || 'Unnamed rep',
            subtitle: 'No manager assigned',
            createdAt: p.created_at || null,
            meta: { userId: p.user_id },
          });
          continue;
        }

        const managerExists = profiles.some(
          (m) => normalizeName(getCanonicalName(m.full_name)) === normalizeName(effectiveManager)
        );
        const managerIsKnownPillarOwner = Object.values(PILLAR_OWNERS).some((o) =>
          namesMatch(effectiveManager, o)
        );

        if (!managerExists && !managerIsKnownPillarOwner && !isTopAdmin(effectiveManager)) {
          next.push({
            key: `sync:${p.id}`,
            type: 'sync',
            id: p.id,
            title: p.full_name || 'Unnamed rep',
            subtitle: `Manager "${effectiveManager}" not found`,
            createdAt: p.created_at || null,
            meta: { userId: p.user_id },
          });
        }
      }

      // Drop dismissed items, then sort oldest-first
      const live = next
        .filter((i) => !dismissed.has(i.key))
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return at - bt;
        });

      setItems(live);
      setCounts({
        pendingApprovals: live.filter((i) => i.type === 'approval').length,
        pendingPitches: live.filter((i) => i.type === 'pitch').length,
        newFeedback: live.filter((i) => i.type === 'feedback').length,
        syncIssues: live.filter((i) => i.type === 'sync').length,
        total: live.length,
      });
    } catch {
      if (mountedRef.current) {
        setItems([]);
        setCounts(EMPTY_COUNTS);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    fetchQueue();

    const channel = supabase
      .channel('admin-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchQueue())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pitch_approval_requests' },
        () => fetchQueue()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () =>
        fetchQueue()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchQueue]);

  /** Records a non-destructive dismissal — underlying data is never deleted. */
  const dismissItems = useCallback(
    async (targets: QueueItem[]) => {
      if (!targets.length) return;
      const rows = targets.map((i) => ({
        item_type: i.type,
        item_key: i.id,
        dismissed_by: user?.id ?? null,
      }));
      await (supabase.from('admin_queue_dismissals' as any) as any).upsert(rows, {
        onConflict: 'item_type,item_key',
      });

      // Feedback also gets resolved so it leaves the feedback tab too
      const feedbackIds = targets.filter((i) => i.type === 'feedback').map((i) => i.id);
      if (feedbackIds.length) {
        await (supabase.from('app_feedback' as any) as any)
          .update({ status: 'reviewed' })
          .in('id', feedbackIds);
      }

      await fetchQueue();
    },
    [fetchQueue, user?.id]
  );

  /** Approves everything that supports approval (reps + pitch submissions). */
  const approveItems = useCallback(
    async (targets: QueueItem[]) => {
      const approvalIds = targets.filter((i) => i.type === 'approval').map((i) => i.id);
      const pitchIds = targets.filter((i) => i.type === 'pitch').map((i) => i.id);

      if (approvalIds.length) {
        await supabase
          .from('profiles')
          .update({ approved: true, status: 'active' as any })
          .in('id', approvalIds);
      }
      if (pitchIds.length) {
        await supabase
          .from('pitch_approval_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id ?? null,
          })
          .in('id', pitchIds);
      }
      await fetchQueue();
    },
    [fetchQueue, user?.id]
  );

  /** Denies everything that supports denial (reps + pitch submissions). */
  const denyItems = useCallback(
    async (targets: QueueItem[]) => {
      const approvalIds = targets.filter((i) => i.type === 'approval').map((i) => i.id);
      const pitchIds = targets.filter((i) => i.type === 'pitch').map((i) => i.id);

      if (approvalIds.length) {
        await supabase
          .from('profiles')
          .update({ status: 'rejected' as any })
          .in('id', approvalIds);
      }
      if (pitchIds.length) {
        await supabase
          .from('pitch_approval_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id ?? null,
          })
          .in('id', pitchIds);
      }
      await fetchQueue();
    },
    [fetchQueue, user?.id]
  );

  return {
    items,
    counts,
    isLoading,
    refetch: fetchQueue,
    dismissItems,
    approveItems,
    denyItems,
  };
}
