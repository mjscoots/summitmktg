import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RepRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  hometown: string | null;
  shirt_size: string | null;
  emergency_contact_name: string | null;
  onboarding_status: string | null;
  created_at: string;
}

interface Chip {
  label: string;
  done: boolean;
}

function chipsFor(r: RepRow, interviewed: boolean, referred: boolean): Chip[] {
  return [
    { label: 'Photo', done: !!r.avatar_url },
    { label: 'Phone', done: !!r.phone?.trim() },
    { label: 'Details', done: !!r.hometown?.trim() && !!r.shirt_size && !!r.emergency_contact_name },
    { label: 'Interview', done: interviewed },
    { label: 'Referrals', done: referred },
  ];
}

/** New reps and what day one still needs from them. */
export function NewRepsPanel({ managerUserIds }: { managerUserIds?: string[] }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RepRow[]>([]);
  const [interviews, setInterviews] = useState<Set<string>>(new Set());
  const [referrers, setReferrers] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    let query = (supabase as any)
      .from('profiles')
      .select(
        'user_id, full_name, avatar_url, phone, hometown, shirt_size, emergency_contact_name, onboarding_status, created_at'
      )
      .gte('created_at', since)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(30);
    if (managerUserIds?.length) query = query.in('user_id', managerUserIds);

    const { data } = await query;
    const list = (data as RepRow[]) || [];
    setRows(list);

    if (list.length) {
      const ids = list.map((r) => r.user_id);
      const [ci, rl] = await Promise.all([
        (supabase as any)
          .from('commitment_interviews')
          .select('rep_id')
          .eq('season', '2027')
          .in('rep_id', ids),
        (supabase as any).from('recruiting_leads').select('referrer_user_id').in('referrer_user_id', ids),
      ]);
      setInterviews(new Set(((ci.data as { rep_id: string }[]) || []).map((r) => r.rep_id)));
      setReferrers(
        new Set(((rl.data as { referrer_user_id: string }[]) || []).map((r) => r.referrer_user_id))
      );
    }
  }, [managerUserIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = rows.filter((r) => {
    const c = chipsFor(r, interviews.has(r.user_id), referrers.has(r.user_id));
    return c.some((x) => !x.done);
  });

  if (!pending.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="micro-label mb-2">New reps</p>
      <ul className="divide-y divide-border">
        {pending.map((r) => (
          <li key={r.user_id} className="py-2.5 first:pt-0 last:pb-0">
            <button
              className="min-h-11 w-full text-left"
              onClick={() => navigate(`/app/person/${r.user_id}`)}
            >
              <p className="text-[14px] font-semibold text-foreground">
                {r.full_name || 'Unnamed'}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {chipsFor(r, interviews.has(r.user_id), referrers.has(r.user_id)).map((c) => (
                  <span
                    key={c.label}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px]',
                      c.done
                        ? 'border-primary/40 text-foreground'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NewRepsPanel;
