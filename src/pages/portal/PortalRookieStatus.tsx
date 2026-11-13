import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { usePortalPeople } from './usePortalPeople';

type BP = { user_id: string; phase_1_complete: boolean | null; phase_2_complete: boolean | null; phase_3_complete: boolean | null; bootcamp_completed: boolean | null };

export default function PortalRookieStatus() {
  const { user, role } = useAuth();
  const allowed = isManagerOrAbove(role);
  const people = usePortalPeople(allowed ? user?.id : undefined);
  const ids = (people.data?.downline ?? []).map((p) => p.user_id);
  const progress = useQuery({
    queryKey: ['portal-rookie-progress', ids],
    enabled: allowed && ids.length > 0,
    queryFn: async () => {
      const [bp, lp, roles] = await Promise.all([
        supabase.from('bootcamp_progress').select('user_id, phase_1_complete, phase_2_complete, phase_3_complete, bootcamp_completed').in('user_id', ids),
        supabase.from('lesson_progress').select('user_id').in('user_id', ids).not('completed_at', 'is', null),
        supabase.from('user_roles').select('user_id, role').in('user_id', ids),
      ]);
      const lessons: Record<string, number> = {};
      if (!lp.error) for (const r of lp.data ?? []) lessons[r.user_id] = (lessons[r.user_id] ?? 0) + 1;
      const roleOf: Record<string, string> = {};
      if (!roles.error) for (const r of roles.data ?? []) roleOf[r.user_id] = r.role;
      const boot: Record<string, BP> = {};
      if (!bp.error) for (const r of (bp.data ?? []) as BP[]) boot[r.user_id] = r;
      return { lessons, roleOf, boot, lessonsOk: !lp.error };
    },
  });

  if (!allowed) return <Navigate to="/portal" replace />;
  const loading = people.isLoading || progress.isLoading && ids.length > 0;
  const yn = (v: boolean | null | undefined) => (v ? 'Yes' : 'No');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rookie Status</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : !ids.length ? (
        <p className="text-muted-foreground">No downline on file.</p>
      ) : (
        <ul className="space-y-3">
          {people.data!.downline.map((p) => {
            const b = progress.data?.boot[p.user_id];
            const r = progress.data?.roleOf[p.user_id];
            const n = progress.data?.lessons[p.user_id];
            return (
              <li key={p.user_id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{p.full_name || 'Name not on file'}</p>
                  <p className="text-xs text-muted-foreground">{[r, p.experience].filter(Boolean).join(' · ')}</p>
                </div>
                {b ? (
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div><dt className="text-muted-foreground">Phase 1</dt><dd>{yn(b.phase_1_complete)}</dd></div>
                    <div><dt className="text-muted-foreground">Phase 2</dt><dd>{yn(b.phase_2_complete)}</dd></div>
                    <div><dt className="text-muted-foreground">Phase 3</dt><dd>{yn(b.phase_3_complete)}</dd></div>
                    <div><dt className="text-muted-foreground">Bootcamp done</dt><dd>{yn(b.bootcamp_completed)}</dd></div>
                  </dl>
                ) : <p className="mt-2 text-sm text-muted-foreground">No progress on file.</p>}
                {progress.data?.lessonsOk && n ? <p className="mt-2 text-sm text-muted-foreground">Lessons completed: {n}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
