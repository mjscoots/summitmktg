import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminCounts {
  pendingApprovals: number;
  pendingApplications: number;
  pendingPitches: number;
  newFeedback: number;
  total: number;
}

export function useAdminCounts() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<AdminCounts>({
    pendingApprovals: 0,
    pendingApplications: 0,
    pendingPitches: 0,
    newFeedback: 0,
    total: 0,
  });

  const isAdmin = role === 'admin';

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

    // Subscribe to realtime changes on key tables
    const channel = supabase
      .channel('admin-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_approval_requests' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return counts;
}
