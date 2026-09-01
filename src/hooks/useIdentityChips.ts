import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Accepted industries and years in the industry, batched for the whole app.
 *
 * The server decides both: identity_chips() reads rep_vertical_enrollments
 * through is_vertical_member(), so a chip only shows for an industry the person
 * was actually accepted into. Years come from profiles.years_in_industry and are
 * null when nothing is on file.
 */
export interface Identity {
  verticals: string[];
  years: number | null;
}

const cache = new Map<string, Identity>();
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
  const { data, error } = await (supabase as any).rpc('identity_chips', { _user_ids: ids });
  const map = (error ? {} : (data as Record<string, Identity> | null)) || {};
  ids.forEach((id) => {
    const row = map[id];
    cache.set(id, {
      verticals: Array.isArray(row?.verticals) ? row.verticals : [],
      years: row?.years ?? null,
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
export function refreshIdentity(userId: string) {
  cache.delete(userId);
  request(userId);
}

export function useIdentity(userId?: string | null): Identity | null {
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
