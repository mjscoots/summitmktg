import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrAbove } from '@/lib/roles';

export interface RollCandidate {
  user_id: string;
  full_name: string | null;
  revenue_to_date: number | null;
  direct_manager: string | null;
  hasFiber: boolean;
  hasLife: boolean;
  fiberStart: string | null;
}

export interface FiberCarrier {
  id: string;
  name: string;
}

/**
 * Everything the rollover surfaces need: the configured season end, the Fiber
 * carriers, and the caller's active Pest reps with their other enrollments.
 */
export function useRollover() {
  const { user, profile, role } = useAuth();
  const admin = isAdminOrAbove(role);
  const [loading, setLoading] = useState(true);
  const [seasonEnd, setSeasonEnd] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<FiberCarrier[]>([]);
  const [reps, setReps] = useState<RollCandidate[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [seasonRes, carrierRes, repRes, enrollRes] = await Promise.all([
      (supabase as any)
        .from('seasons')
        .select('ends_on')
        .eq('is_active', true)
        .order('ends_on', { ascending: false })
        .limit(1),
      (supabase as any).from('carriers').select('id, name').eq('vertical', 'Fiber').eq('active', true).order('name'),
      (supabase as any)
        .from('profiles')
        .select('user_id, full_name, revenue_to_date, direct_manager, vertical, status, archived')
        .eq('archived', false)
        .eq('status', 'active'),
      (supabase as any).from('rep_vertical_enrollments').select('user_id, vertical, start_date'),
    ]);

    setSeasonEnd(((seasonRes.data as { ends_on: string | null }[]) || [])[0]?.ends_on || null);
    setCarriers((carrierRes.data as FiberCarrier[]) || []);

    const enrolls = (enrollRes.data as { user_id: string; vertical: string; start_date: string | null }[]) || [];
    const fiber = new Map(enrolls.filter((e) => e.vertical === 'Fiber').map((e) => [e.user_id, e.start_date]));
    const life = new Set(enrolls.filter((e) => e.vertical === 'Life').map((e) => e.user_id));

    const myName = profile?.full_name || '';
    const rows = ((repRes.data as any[]) || [])
      .filter((p) => (p.vertical || 'Pest') === 'Pest')
      .filter((p) => p.user_id !== user.id)
      .filter((p) => admin || (myName && p.direct_manager === myName))
      .map<RollCandidate>((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        revenue_to_date: p.revenue_to_date ?? null,
        direct_manager: p.direct_manager ?? null,
        hasFiber: fiber.has(p.user_id),
        hasLife: life.has(p.user_id),
        fiberStart: fiber.get(p.user_id) ?? null,
      }));

    setReps(rows);
    setLoading(false);
  }, [user?.id, profile?.full_name, admin]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, seasonEnd, carriers, reps, refresh: load };
}

/** A rep's own Fiber start, for the rep-facing cards. */
export function useMyFiberStart() {
  const { user } = useAuth();
  const [start, setStart] = useState<string | null>(null);
  const [carrier, setCarrier] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data } = await (supabase as any)
        .from('rep_vertical_enrollments')
        .select('start_date, carrier_id')
        .eq('user_id', user.id)
        .eq('vertical', 'Fiber')
        .maybeSingle();
      const row = data as { start_date: string | null; carrier_id: string | null } | null;
      setStart(row?.start_date || null);
      if (row?.carrier_id) {
        const { data: c } = await (supabase as any)
          .from('carriers')
          .select('name')
          .eq('id', row.carrier_id)
          .maybeSingle();
        setCarrier((c as { name: string } | null)?.name || null);
      }
    })();
  }, [user?.id]);

  return { start, carrier };
}
