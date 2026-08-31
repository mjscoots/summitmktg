import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RadarRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  manager_name: string | null;
  last_seen_at: string | null;
  days_quiet: number | null;
}

type Bucket = 'never' | '30' | '14' | '7';

const BUCKET_LABEL: Record<Bucket, string> = {
  never: 'Never opened the app',
  '30': 'Quiet 30 days or more',
  '14': 'Quiet 14 days or more',
  '7': 'Quiet 7 days or more',
};

const ORDER: Bucket[] = ['never', '30', '14', '7'];

/** Days since last app activity for the people a manager is responsible for. */
export function DarkRepRadar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [rows, setRows] = useState<RadarRow[]>([]);
  const [staff, setStaff] = useState(false);
  const [managerFilter, setManagerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('dark_rep_radar', { _manager: null });
    setRows((data?.rows as RadarRow[]) ?? []);
    setStaff(Boolean(data?.staff));
  }, []);

  // The list is empty for a signed out caller, so wait for the session before
  // asking; otherwise a fast mount leaves the card permanently hidden.
  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [load, authLoading, user]);


  const managers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.manager_name) set.add(r.manager_name);
    return [...set].sort();
  }, [rows]);

  const buckets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (staff && managerFilter !== 'all' && r.manager_name !== managerFilter) return false;
      if (q && !(r.full_name ?? '').toLowerCase().includes(q)) return false;
      const d = r.days_quiet;
      return r.last_seen_at === null || (d !== null && d >= 7);
    });
    const map: Record<Bucket, RadarRow[]> = { never: [], '30': [], '14': [], '7': [] };
    for (const r of filtered) {
      if (r.last_seen_at === null) map.never.push(r);
      else if ((r.days_quiet ?? 0) >= 30) map['30'].push(r);
      else if ((r.days_quiet ?? 0) >= 14) map['14'].push(r);
      else map['7'].push(r);
    }
    for (const key of ORDER) {
      map[key].sort((a, b) => (b.days_quiet ?? 0) - (a.days_quiet ?? 0));
    }
    return map;
  }, [rows, staff, managerFilter, search]);

  const total = ORDER.reduce((n, k) => n + buckets[k].length, 0);

  const checkIn = async (row: RadarRow) => {
    setBusy(row.user_id);
    const { data, error } = await (supabase as any).rpc('start_dm', { _other: row.user_id });
    setBusy(null);
    if (error || data?.error) {
      toast.error('That did not work. Try again.');
      return;
    }
    if (data?.slug) navigate(`/app/chat?room=${data.slug}`);
  };

  if (rows.length === 0) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-card/60 p-4 backdrop-blur-sm sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Radar className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Quiet reps</h2>
          <p className="text-[12px] text-muted-foreground tabular-nums">
            {total === 0 ? 'Everyone has opened the app this week' : `${total} quiet 7 days or more`}
          </p>
        </div>
      </div>

      {total > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search names"
                className="h-11 pl-8 text-[13px]"
              />
            </div>
            {staff && managers.length > 0 && (
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="h-11 rounded-lg border border-border/60 bg-surface px-2 text-[13px] text-foreground"
              >
                <option value="all">All managers</option>
                {managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-3 space-y-4">
            {ORDER.filter((k) => buckets[k].length > 0).map((key) => (
              <div key={key}>
                <p className="micro-label">{BUCKET_LABEL[key]}</p>
                <div className="mt-2 space-y-2">
                  {buckets[key].map((r) => (
                    <div
                      key={r.user_id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface p-2.5"
                    >
                      <UserAvatar avatarUrl={r.avatar_url} fullName={r.full_name ?? ''} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {r.full_name ?? 'Rep'}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground tabular-nums">
                          {r.last_seen_at === null
                            ? 'Never opened'
                            : `${r.days_quiet} day${r.days_quiet === 1 ? '' : 's'} quiet`}
                          {staff && r.manager_name ? ` · ${r.manager_name}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 shrink-0"
                        disabled={busy === r.user_id}
                        onClick={() => checkIn(r)}
                      >
                        Check in
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default DarkRepRadar;
