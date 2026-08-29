import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RoleChipLabel } from '@/components/shared/RoleChip';

/**
 * Role chip labels, batched for the whole app.
 *
 * The label is decided in the database by role_chips(): user_roles for Owner and
 * Admin, is_effective_manager() for Manager, profiles.rep_year for Vet and Rookie.
 * People with no rep year on file get no label, so nobody is guessed into Rookie.
 */
const cache = new Map<string, RoleChipLabel | null>();
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
  const { data, error } = await (supabase as any).rpc('role_chips', { _user_ids: ids });
  const map = (error ? {} : (data as Record<string, string> | null)) || {};
  ids.forEach((id) => {
    const label = map[id];
    cache.set(id, (label as RoleChipLabel | undefined) ?? null);
  });
  notify();
}

function request(id: string) {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  if (!timer) timer = setTimeout(flush, 60);
}

export function useRoleChip(userId?: string | null): RoleChipLabel | null {
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
