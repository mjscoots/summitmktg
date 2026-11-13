import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Person { user_id: string; full_name: string | null; experience?: string | null }

async function names(ids: string[]): Promise<Person[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('user_id, full_name, experience').in('user_id', ids);
  if (error || !data) return [];
  return data as Person[];
}

/** Read-only: only edges that involve the signed-in user. */
export function usePortalPeople(userId: string | undefined) {
  return useQuery({
    queryKey: ['portal-people', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [up, down] = await Promise.all([
        supabase.from('downline_edges').select('parent_user_id, edge_type').eq('child_user_id', userId!),
        supabase.from('downline_edges').select('child_user_id, edge_type').eq('parent_user_id', userId!),
      ]);
      const pick = <T extends { edge_type: string }>(rows: T[] | null) => {
        const r = rows ?? []; const m = r.filter((x) => x.edge_type === 'manages'); return m.length ? m : r;
      };
      const upIds = [...new Set(pick(up.error ? null : up.data).map((e) => e.parent_user_id))];
      const downIds = [...new Set(pick(down.error ? null : down.data).map((e) => e.child_user_id))];
      const [upline, downline] = await Promise.all([names(upIds), names(downIds)]);
      return { upline, downline };
    },
  });
}
