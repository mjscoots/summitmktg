import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlitzCapState {
  capacity: number | null;
  going_count?: number;
  spots_left?: number;
  my_position?: number | null;
  is_staff?: boolean;
  waitlist?: { user_id: string; name: string | null; position: number }[] | null;
  error?: string;
}

/**
 * Pass 146 — live cap state for one blitz event. The database owns the cap and the
 * waitlist order; this only reads and refreshes when attendance moves.
 */
export function useBlitzCap(eventId: string | null | undefined) {
  const [state, setState] = useState<BlitzCapState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    const { data } = await (supabase as any).rpc('blitz_cap_state', { p_event_id: eventId });
    const next = data as BlitzCapState | null;
    setState(next && !next.error ? next : null);
  }, [eventId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`blitz-cap-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_attendance', filter: `event_id=eq.${eventId}` }, () => { void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blitz_waitlist', filter: `event_id=eq.${eventId}` }, () => { void refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, refresh]);

  const join = useCallback(async () => {
    if (!eventId) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('join_blitz_waitlist', { p_event_id: eventId });
    setBusy(false);
    if (error) { toast.error('Could not add you to the waitlist'); return; }
    if (data && (data as { joined?: boolean }).joined === false) {
      toast.success('A spot opened. Tap Going to take it.');
    } else {
      toast.success('You are on the waitlist');
    }
    void refresh();
  }, [eventId, refresh]);

  const leave = useCallback(async () => {
    if (!eventId) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('leave_blitz_waitlist', { p_event_id: eventId });
    setBusy(false);
    if (error) { toast.error('Could not update the waitlist'); return; }
    toast.success('You left the waitlist');
    void refresh();
  }, [eventId, refresh]);

  return { state, busy, refresh, join, leave };
}

/** Shared copy for the database cap refusal so both cards read the same. */
export const BLITZ_FULL_MESSAGE = 'This blitz is full. Join the waitlist to hold your place.';
