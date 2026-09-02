import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Display only status badges, batched for the whole app the same way the
 * identity chips are. The server decides everything: badges_for() reads the
 * rows that already exist (signed 2027 leads, confirmed resign intents, blitz
 * attendance marked present, people brought in who reached fully onboarded).
 * No points, no comp, no competition math.
 */
export interface BlitzPatch {
  title: string;
  year: number;
}

export interface StatusBadges {
  locked_in: boolean;
  blitz_patches: BlitzPatch[];
  recruiter_stars: number;
}

const EMPTY: StatusBadges = { locked_in: false, blitz_patches: [], recruiter_stars: 0 };

const cache = new Map<string, StatusBadges>();
const listeners = new Set<() => void>();
let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

async function flush() {
  timer = null;
  const ids = Array.from(pending);
  pending = new Set();
  if (!ids.length) return;
  const { data, error } = await (supabase as any).rpc('badges_for', { _user_ids: ids });
  const map = (error ? {} : (data as Record<string, StatusBadges> | null)) || {};
  ids.forEach((id) => {
    const row = map[id];
    cache.set(id, {
      locked_in: row?.locked_in === true,
      blitz_patches: Array.isArray(row?.blitz_patches) ? row.blitz_patches : [],
      recruiter_stars: typeof row?.recruiter_stars === 'number' ? row.recruiter_stars : 0,
    });
  });
  notify();
}

function request(id: string) {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  if (!timer) timer = setTimeout(flush, 60);
}

/** Clears one person from the cache so a correction shows straight away. */
export function refreshStatusBadges(userId: string) {
  cache.delete(userId);
  request(userId);
}

export function useStatusBadges(userId?: string | null): StatusBadges | null {
  const [, force] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    request(userId);
    if (cache.has(userId)) listener();
    return () => {
      listeners.delete(listener);
    };
  }, [userId]);

  if (!userId) return null;
  return cache.get(userId) ?? null;
}

export { EMPTY as EMPTY_STATUS_BADGES };
