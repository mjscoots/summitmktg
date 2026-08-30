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

export type QueueItemType =
  | 'approval'
  | 'application'
  | 'team_lead'
  | 'pairing'
  | 'pitch'
  | 'feedback'
  | 'resign'
  | 'sync';

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
  verticalRequests: number;
  reactivations: number;
  pendingApplications: number;
  teamLeadApplications: number;
  pairingRequests: number;
  pendingPitches: number;
  newFeedback: number;
  resignIntents: number;
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
  verticalRequests: 0,
  reactivations: 0,
  pendingApplications: 0,
  teamLeadApplications: 0,
  pairingRequests: 0,
  pendingPitches: 0,
  newFeedback: 0,
  resignIntents: 0,
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
      const [
        profilesRes,
        rolesRes,
        pitchesRes,
        feedbackRes,
        dismissedRes,
        applicationsRes,
        teamLeadRes,
        pairingRes,
        verticalRes,
        reactivationRes,
        resignRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, user_id, full_name, status, approved, onboarding_status, direct_manager, recruiter, team_id, created_at'
          )
          .eq('archived', false),
        supabase.from('user_roles').select('user_id, role'),
        supabase
          .from('pitch_approval_requests')
          .select('id, user_id, lesson_id, submitted_at, video_url')
          .eq('status', 'pending'),
        (supabase.from('app_feedback' as any) as any)
          .select('id, user_id, feedback_type, message, created_at')
          .eq('status', 'open'),
        (supabase.from('admin_queue_dismissals' as any) as any).select('item_type, item_key'),
        (supabase.from('applications' as any) as any)
          .select('id, full_name, application_type, status, created_at')
          .eq('status', 'pending'),
        (supabase.from('team_lead_applications' as any) as any)
          .select('id, user_id, status, created_at')
          .eq('status', 'pending'),
        (supabase.from('pairing_requests' as any) as any)
          .select('id, rep_id, manager_id, status, created_at')
          .eq('status', 'pending'),
        supabase.rpc('get_vertical_requests' as never, { _status: 'pending' } as never),
        supabase.rpc('get_reactivation_requests' as never),
        supabase.rpc('list_resign_intents' as never),
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
        // A real decision is someone still waiting to be let in — people already
        // on the active roster are not approval work.
        // Waiting means: not archived (query), never approved, and not NLC.
        .filter((p) => p.approved === false && p.status !== 'nlc' && p.status !== 'rejected' && !isFakeProfile(p))
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

      // === PUBLIC APPLICATIONS ===
      ((applicationsRes.data as any[]) || []).forEach((a) => {
        next.push({
          key: `application:${a.id}`,
          type: 'application',
          id: a.id,
          title: a.full_name || 'Application',
          subtitle: `${a.application_type === 'veteran' ? 'Veteran' : 'Rookie'} application · ${a.status}`,
          createdAt: a.created_at || null,
        });
      });

      // === TEAM LEAD APPLICATIONS ===
      ((teamLeadRes.data as any[]) || []).forEach((t) => {
        next.push({
          key: `team_lead:${t.id}`,
          type: 'team_lead',
          id: t.id,
          title: nameByUser.get(t.user_id) || 'Team lead application',
          subtitle: 'Wants to run a team',
          createdAt: t.created_at || null,
          meta: { userId: t.user_id },
        });
      });

      // === PAIRING REQUESTS ===
      ((pairingRes.data as any[]) || []).forEach((r) => {
        next.push({
          key: `pairing:${r.id}`,
          type: 'pairing',
          id: r.id,
          title: nameByUser.get(r.rep_id) || 'Pairing request',
          subtitle: `Manager: ${nameByUser.get(r.manager_id) || 'not found'}`,
          createdAt: r.created_at || null,
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

      // === RE-SIGN INTENTS ===
      ((resignRes.data as any[]) || []).forEach((r) => {
        next.push({
          key: `resign:${r.id}`,
          type: 'resign',
          id: r.id,
          title: r.full_name || 'Re-sign intent',
          subtitle: 'Raised a hand for 2027',
          createdAt: r.created_at || null,
          meta: { userId: r.user_id },
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

      const verticalRequests = ((verticalRes.data as any[]) || []).length;
      // The RPC already returns only requests still open.
      const reactivations = ((reactivationRes.data as any[]) || []).length;

      setItems(live);
      const approvals = live.filter((i) => i.type === 'approval').length;
      const applications = live.filter((i) => i.type === 'application').length;
      const pitches = live.filter((i) => i.type === 'pitch').length;
      const resigns = live.filter((i) => i.type === 'resign').length;
      setCounts({
        pendingApprovals: approvals,
        verticalRequests,
        reactivations,
        pendingApplications: applications,
        teamLeadApplications: live.filter((i) => i.type === 'team_lead').length,
        pairingRequests: live.filter((i) => i.type === 'pairing').length,
        pendingPitches: pitches,
        newFeedback: live.filter((i) => i.type === 'feedback').length,
        resignIntents: live.filter((i) => i.type === 'resign').length,
        syncIssues: live.filter((i) => i.type === 'sync').length,
        // The badge counts decisions only: approvals, applications, vertical
        // requests, pitch reviews and reactivations. Nothing else.
        total: approvals + applications + verticalRequests + pitches + reactivations + resigns,
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
          .update({ status: 'wont_fix' })
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
      const resignIds = targets.filter((i) => i.type === 'resign').map((i) => i.id);

      for (const id of resignIds) {
        await (supabase as any).rpc('decide_resign_intent', { _intent_id: id, _confirm: true });
      }

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
      const resignIds = targets.filter((i) => i.type === 'resign').map((i) => i.id);

      for (const id of resignIds) {
        await (supabase as any).rpc('decide_resign_intent', { _intent_id: id, _confirm: false });
      }

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
