import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SchedulingRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  proposed_times: string[]; // ISO date strings
  chosen_time: string | null;
  status: 'pending' | 'confirmed' | 'reschedule_requested' | 'completed' | 'cancelled';
  form_type: string;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  // Enriched
  requester_name?: string;
  recipient_name?: string;
  requester_avatar?: string | null;
  recipient_avatar?: string | null;
}

export function useSchedulingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SchedulingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);

    const { data, error } = await supabase
      .from('scheduling_requests')
      .select('*')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setIsLoading(false); return; }

    if (!data || data.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    // Enrich with names
    const allUserIds = [...new Set(data.flatMap(d => [d.requester_id, d.recipient_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', allUserIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched = data.map(r => ({
      ...r,
      proposed_times: Array.isArray(r.proposed_times) ? (r.proposed_times as any[]).map(String) : [],
      status: r.status as SchedulingRequest['status'],
      requester_name: profileMap.get(r.requester_id)?.full_name || 'Unknown',
      recipient_name: profileMap.get(r.recipient_id)?.full_name || 'Unknown',
      requester_avatar: profileMap.get(r.requester_id)?.avatar_url,
      recipient_avatar: profileMap.get(r.recipient_id)?.avatar_url,
    }));

    setRequests(enriched);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();

    if (!user) return;
    const channel = supabase
      .channel('scheduling-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduling_requests' }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests, user]);

  const createRequest = async (recipientId: string, proposedTimes: string[], formType = 'weekly_1on1', notes?: string) => {
    if (!user) return;
    const { error } = await supabase.from('scheduling_requests').insert({
      requester_id: user.id,
      recipient_id: recipientId,
      proposed_times: proposedTimes as any,
      form_type: formType,
      notes: notes || null,
    });
    if (error) throw error;
  };

  const confirmRequest = async (requestId: string, chosenTime: string) => {
    const { error } = await supabase.from('scheduling_requests').update({
      status: 'confirmed',
      chosen_time: chosenTime,
      confirmed_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) throw error;
  };

  const rescheduleRequest = async (requestId: string, newTimes: string[], notes?: string) => {
    const { error } = await supabase.from('scheduling_requests').update({
      status: 'reschedule_requested',
      proposed_times: newTimes as any,
      notes: notes || null,
    }).eq('id', requestId);
    if (error) throw error;
  };

  const completeRequest = async (requestId: string) => {
    const { error } = await supabase.from('scheduling_requests').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) throw error;
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase.from('scheduling_requests').update({
      status: 'cancelled',
    }).eq('id', requestId);
    if (error) throw error;
  };

  const pendingForMe = requests.filter(r => r.recipient_id === user?.id && r.status === 'pending');
  const myPending = requests.filter(r => r.requester_id === user?.id && r.status === 'pending');

  return {
    requests,
    pendingForMe,
    myPending,
    isLoading,
    createRequest,
    confirmRequest,
    rescheduleRequest,
    completeRequest,
    cancelRequest,
    refetch: fetchRequests,
  };
}
