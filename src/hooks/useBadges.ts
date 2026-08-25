import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserBadge {
  user_id: string;
  badge_key: string;
  name: string;
  description: string | null;
  kind: 'milestone' | 'certification';
  icon: string;
  sort_order: number;
  granted_at: string;
}

type BadgeMap = Record<string, UserBadge[]>;

let cache: BadgeMap | null = null;
let inflight: Promise<BadgeMap> | null = null;
const listeners = new Set<(m: BadgeMap) => void>();

async function load(): Promise<BadgeMap> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from('user_badges')
      .select('user_id, badge_key, granted_at, badge_definitions!inner(name, description, kind, icon, sort_order, active)');
    const map: BadgeMap = {};
    for (const row of (data as any[]) || []) {
      const def = row.badge_definitions;
      if (!def?.active) continue;
      const badge: UserBadge = {
        user_id: row.user_id,
        badge_key: row.badge_key,
        name: def.name,
        description: def.description,
        kind: def.kind,
        icon: def.icon,
        sort_order: def.sort_order,
        granted_at: row.granted_at,
      };
      (map[row.user_id] ||= []).push(badge);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.sort_order - b.sort_order);
    cache = map;
    inflight = null;
    listeners.forEach((l) => l(map));
    return map;
  })();
  return inflight;
}

/** Invalidate the badge cache (after granting/revoking). */
export function refreshBadges() {
  cache = null;
  inflight = null;
  load().then((m) => listeners.forEach((l) => l(m)));
}

/** Badges for every user, keyed by user id. Loaded once per session. */
export function useBadgeMap() {
  const [map, setMap] = useState<BadgeMap>(cache || {});

  useEffect(() => {
    let active = true;
    load().then((m) => { if (active) setMap(m); });
    const l = (m: BadgeMap) => { if (active) setMap({ ...m }); };
    listeners.add(l);
    return () => { active = false; listeners.delete(l); };
  }, []);

  return map;
}

/** Badges for a single user. */
export function useUserBadges(userId?: string | null) {
  const map = useBadgeMap();
  return userId ? map[userId] || [] : [];
}
