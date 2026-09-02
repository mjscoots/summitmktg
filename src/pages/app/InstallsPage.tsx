import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TodayNumberSheet, PAY_NOTE } from '@/components/fiber/TodayNumberSheet';
import { useFiberToday } from '@/hooks/useFiberToday';
import { isManagerOrAbove } from '@/lib/roles';

const CARD = 'rounded-xl border border-border bg-card';

interface WeekRow {
  week_start: string;
  installs: number;
  cancels: number;
  carrier_id: string;
}

interface TeamRow {
  user_id: string;
  full_name: string | null;
  installs: number;
}

function weekStart(): string {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Fiber installs: log one, see your weeks, and for leads, the team's week. */
export default function InstallsPage() {
  const { user, role } = useAuth();
  const { activeVertical } = useWorkspace();
  const navigate = useNavigate();
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [carriers, setCarriers] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const isLead = isManagerOrAbove(role);
  const { today: todaySold, week: weekSold, reload: reloadToday } = useFiberToday();

  const load = useCallback(async () => {
    if (!user) return;
    const [f, c] = await Promise.all([
      (supabase as any)
        .from('fiber_installs')
        .select('week_start, installs, cancels, carrier_id')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false }),
      (supabase as any).from('carriers').select('id, name'),
    ]);
    setRows((f.data as WeekRow[]) || []);
    const map: Record<string, string> = {};
    ((c.data as { id: string; name: string }[]) || []).forEach((r) => {
      map[r.id] = r.name;
    });
    setCarriers(map);

    if (isLead) {
      const { data } = await (supabase as any).rpc('get_fiber_leaderboard', { p_week_start: weekStart() });
      setTeam((data as TeamRow[]) || []);
    }
    setLoading(false);
  }, [user, isLead]);

  useEffect(() => {
    void load();
  }, [load]);

  const season = rows.reduce((a, r) => a + (r.installs || 0), 0);
  const thisWeek = rows.filter((r) => r.week_start === weekStart()).reduce((a, r) => a + (r.installs || 0), 0);

  if (activeVertical !== 'Fiber') {
    return (
      <AppLayout>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <PageHeader title="Installs" context="Installs are tracked in the Fiber workspace." />
          <Button variant="outline" className="min-h-11" onClick={() => navigate('/app')}>
            Back to home
          </Button>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <PageHeader title="Numbers" context="What you sold today and this week." />

        <div className="grid grid-cols-3 gap-2.5">
          <div className={`${CARD} p-3`}>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-2xl font-medium tabular-nums text-primary">{todaySold}</p>
          </div>
          <div className={`${CARD} p-3`}>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-2xl font-medium tabular-nums text-primary">{Math.max(thisWeek, weekSold)}</p>
          </div>
          <div className={`${CARD} p-3`}>
            <p className="text-xs text-muted-foreground">Season</p>
            <p className="text-2xl font-medium tabular-nums text-primary">{season}</p>
          </div>
        </div>

        <Button className="min-h-11 w-full" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          How many today?
        </Button>

        <p className="text-xs text-muted-foreground">{PAY_NOTE}</p>

        <section className={`${CARD} p-4`}>
          <h2 className="mb-3 text-sm font-medium text-foreground">My weeks</h2>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Installs appear here from the weekly Gainz sheet once your manager loads it.</p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={`${r.week_start}-${r.carrier_id}`} className="flex items-center gap-3 py-2 text-sm">
                  <span className="tabular-nums text-foreground">{r.week_start}</span>
                  <span className="text-muted-foreground">{carriers[r.carrier_id] || '-'}</span>
                  <span className="ml-auto tabular-nums text-foreground">{r.installs} installs</span>
                  <span className="tabular-nums text-muted-foreground">{r.cancels} cancels</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {isLead && (
          <section className={`${CARD} p-4`}>
            <h2 className="mb-3 text-sm font-medium text-foreground">Team this week</h2>
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing this week yet. Installs appear here from the weekly Gainz sheet once your manager loads it.</p>
            ) : (
              <div className="divide-y divide-border">
                {team.map((t) => (
                  <button
                    key={t.user_id}
                    onClick={() => navigate(`/app/person/${t.user_id}`)}
                    className="flex min-h-11 w-full items-center gap-3 py-2 text-left text-sm"
                  >
                    <span className="truncate text-foreground">{t.full_name || 'Unnamed'}</span>
                    <span className="ml-auto tabular-nums text-primary">{t.installs}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <TodayNumberSheet open={open} onOpenChange={setOpen} onSaved={() => { void load(); void reloadToday(); }} />
      </main>
    </AppLayout>
  );
}
