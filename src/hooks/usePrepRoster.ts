import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseRepYear, nextRepYear, repYearLabel } from '@/lib/repYear';

export interface PrepRosterPerson {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  team_name: string | null;
  role: string;
  rep_year: string | null;
  is_vet: boolean;
  manager_user_id: string | null;
  manager_name: string | null;
  manager_team: string | null;
  group_key: string;
  group_label: string;
}

export interface PrepRosterGroup {
  key: string;
  label: string;
  team: string | null;
  people: PrepRosterPerson[];
}

/**
 * Roster for the one on one prep screen. Scope is decided by the database
 * (prep_roster) so the client never filters a broader list: owner and admin
 * get every group, a manager gets his own direct reports, a rep gets nothing.
 */
export function usePrepRoster(mode: 'rookie' | 'manager') {
  const { user } = useAuth();
  const [people, setPeople] = useState<PrepRosterPerson[]>([]);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) {
      setPeople([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('prep_roster');
    if (error) console.error('prep_roster failed:', error);
    setPeople(((data as PrepRosterPerson[]) || []));
    setLoading(false);
  }, [user?.id]);

  const loadLogged = useCallback(async () => {
    if (!user?.id) return;
    const monday = new Date();
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const since = monday.toISOString();

    if (mode === 'manager') {
      const { data } = await supabase
        .from('weekly_one_on_ones_manager')
        .select('manager_user_id')
        .gte('created_at', since);
      setLoggedIds(new Set((data || []).map((r) => r.manager_user_id).filter(Boolean) as string[]));
    } else {
      const { data } = await supabase
        .from('weekly_one_on_ones_rookie')
        .select('rookie_user_id')
        .gte('created_at', since);
      setLoggedIds(new Set((data || []).map((r) => r.rookie_user_id).filter(Boolean) as string[]));
    }
  }, [user?.id, mode]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadLogged(); }, [loadLogged]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byMode = people.filter((p) =>
      mode === 'manager'
        ? p.role === 'manager' || p.role === 'admin' || p.role === 'owner'
        : p.role === 'rookie' || p.role === 'recruiter'
    );
    if (!q) return byMode;
    return byMode.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.team_name || '').toLowerCase().includes(q) ||
        (p.group_label || '').toLowerCase().includes(q)
    );
  }, [people, search, mode]);

  const groups = useMemo<PrepRosterGroup[]>(() => {
    const map = new Map<string, PrepRosterGroup>();
    filtered.forEach((p) => {
      const existing = map.get(p.group_key);
      if (existing) existing.people.push(p);
      else map.set(p.group_key, { key: p.group_key, label: p.group_label, team: p.manager_team, people: [p] });
    });
    return [...map.values()].sort((a, b) => {
      if (a.key === 'unassigned') return 1;
      if (b.key === 'unassigned') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [filtered]);

  const total = filtered.length;
  const loggedCount = filtered.filter((p) => loggedIds.has(p.user_id)).length;

  return {
    groups,
    total,
    loggedCount,
    owedCount: Math.max(0, total - loggedCount),
    loggedIds,
    loading,
    search,
    setSearch,
    refresh: async () => { await Promise.all([load(), loadLogged()]); },
    markLogged: (id: string) => setLoggedIds((prev) => new Set([...prev, id])),
  };
}

/** Next season year label for a stored rep_year, null counts as first year. */
export function nextYearLabel(repYear: string | null): string {
  return repYearLabel(nextRepYear(repYear ?? 1));
}

export { parseRepYear };
