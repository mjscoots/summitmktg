import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PitchApprovalRequest {
  id: string;
  user_id: string;
  lesson_id: string;
  video_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  manager_feedback: string | null;
  attempt_number: number;
  created_at: string;
}

export interface PitchApprovalWithDetails extends PitchApprovalRequest {
  user_name?: string;
  user_avatar?: string | null;
  lesson_title?: string;
  reviewer_name?: string;
}

/** Hook for rookies: get pitch status for a specific lesson */
export function useLessonPitchStatus(lessonId: string | undefined) {
  const { user } = useAuth();
  const [pitchRequest, setPitchRequest] = useState<PitchApprovalRequest | null>(null);
  const [requiresPitch, setRequiresPitch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !lessonId) { setIsLoading(false); return; }

    const [lessonRes, pitchRes] = await Promise.all([
      supabase
        .from('training_lessons')
        .select('requires_pitch_approval')
        .eq('id', lessonId)
        .maybeSingle(),
      supabase
        .from('pitch_approval_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setRequiresPitch(!!lessonRes.data?.requires_pitch_approval);
    setPitchRequest(pitchRes.data as PitchApprovalRequest | null);
    setIsLoading(false);
  }, [user, lessonId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { pitchRequest, requiresPitch, isLoading, refresh };
}

/** Hook for managers: get all pending approvals */
export function useManagerPitchApprovals() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<PitchApprovalWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || (role !== 'manager' && role !== 'admin')) {
      setIsLoading(false);
      return;
    }

    // Get all pitch requests
    const { data: pitchData } = await supabase
      .from('pitch_approval_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (!pitchData || pitchData.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    // Get user profiles and lesson titles
    const userIds = [...new Set(pitchData.map(p => p.user_id))];
    const lessonIds = [...new Set(pitchData.map(p => p.lesson_id))];
    const reviewerIds = [...new Set(pitchData.filter(p => p.reviewed_by).map(p => p.reviewed_by!))];

    const [profilesRes, lessonsRes, reviewersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
      supabase.from('training_lessons').select('id, title').in('id', lessonIds),
      reviewerIds.length > 0
        ? supabase.from('profiles').select('user_id, full_name').in('user_id', reviewerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const lessonMap = new Map((lessonsRes.data || []).map(l => [l.id, l]));
    const reviewerMap = new Map((reviewersRes.data || []).map(r => [r.user_id, r]));

    const enriched: PitchApprovalWithDetails[] = pitchData.map(p => ({
      ...p,
      status: p.status as 'pending' | 'approved' | 'rejected',
      user_name: profileMap.get(p.user_id)?.full_name || 'Unknown',
      user_avatar: profileMap.get(p.user_id)?.avatar_url || null,
      lesson_title: lessonMap.get(p.lesson_id)?.title || 'Unknown Lesson',
      reviewer_name: p.reviewed_by ? reviewerMap.get(p.reviewed_by)?.full_name || undefined : undefined,
    }));

    setRequests(enriched);
    setIsLoading(false);
  }, [user, role]);

  useEffect(() => { refresh(); }, [refresh]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return { requests, pendingCount, isLoading, refresh };
}

/** Check if all pitch approvals are met for a module */
export async function checkModulePitchApprovals(
  userId: string,
  lessonIds: string[]
): Promise<boolean> {
  if (lessonIds.length === 0) return true;

  // Get lessons that require pitch approval
  const { data: lessons } = await supabase
    .from('training_lessons')
    .select('id, requires_pitch_approval')
    .in('id', lessonIds);

  const pitchLessons = (lessons || []).filter(l => l.requires_pitch_approval);
  if (pitchLessons.length === 0) return true;

  // Check if all have approved status
  const { data: approvals } = await supabase
    .from('pitch_approval_requests')
    .select('lesson_id, status')
    .eq('user_id', userId)
    .in('lesson_id', pitchLessons.map(l => l.id))
    .eq('status', 'approved');

  const approvedIds = new Set((approvals || []).map(a => a.lesson_id));
  return pitchLessons.every(l => approvedIds.has(l.id));
}
