import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminCounts {
  pendingApprovals: number;
  pendingApplications: number;
  pendingPitches: number;
  newFeedback: number;
  total: number;
}

type AdminCountKey = 'pendingApprovals' | 'pendingApplications' | 'pendingPitches' | 'newFeedback';

export function useAdminCounts() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<AdminCounts>({
    pendingApprovals: 0,
    pendingApplications: 0,
    pendingPitches: 0,
    newFeedback: 0,
    total: 0,
  });
  const [viewed, setViewed] = useState<Set<AdminCountKey>>(new Set());

  const isAdmin = role === 'admin' || role === 'owner';

  useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      const [approvalsRes, applicationsRes, pitchesRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('approved', false),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('pitch_approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        (supabase.from('app_feedback' as any) as any).select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      const pendingApprovals = approvalsRes.count || 0;
      const pendingApplications = applicationsRes.count || 0;
      const pendingPitches = pitchesRes.count || 0;
      const newFeedback = feedbackRes.count || 0;

      setCounts({
        pendingApprovals,
        pendingApplications,
        pendingPitches,
        newFeedback,
        total: pendingApprovals + pendingApplications + pendingPitches + newFeedback,
      });
    };

    fetchCounts();

    const channel = supabase
      .channel('admin-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_approval_requests' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const markViewed = useCallback((key: AdminCountKey) => {
    setViewed(prev => new Set(prev).add(key));
  }, []);

  // Return counts with viewed ones zeroed out
  const displayCounts: AdminCounts = {
    pendingApprovals: viewed.has('pendingApprovals') ? 0 : counts.pendingApprovals,
    pendingApplications: viewed.has('pendingApplications') ? 0 : counts.pendingApplications,
    pendingPitches: viewed.has('pendingPitches') ? 0 : counts.pendingPitches,
    newFeedback: viewed.has('newFeedback') ? 0 : counts.newFeedback,
    total: 0,
  };
  displayCounts.total = displayCounts.pendingApprovals + displayCounts.pendingApplications + displayCounts.pendingPitches + displayCounts.newFeedback;

  return { ...displayCounts, markViewed };
}
