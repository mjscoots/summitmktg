import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagerWeek, attentionReasons, type WeekRow } from '@/hooks/useManagerWeek';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { cn } from '@/lib/utils';

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="inline-flex h-5 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-primary/60"
          style={{ height: `${Math.max(2, Math.round((v / max) * 20))}px` }}
        />
      ))}
    </span>
  );
}

function lastOpen(at: string | null): string {
  if (!at) return 'never';
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function Row({ row, lastOpened }: { row: WeekRow; lastOpened: string | null }) {
  const navigate = useNavigate();
  const reasons = attentionReasons(row, lastOpened);
  const delta = row.training_week - row.training_prev;

  return (
    <li className={cn('rounded-[10px] border border-border bg-card p-3', row.needs_attention && 'border-primary/60')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{row.full_name || 'Rep'}</p>
          <p className="text-xs text-muted-foreground">
            {row.team_name || 'No team'}
            {row.vertical ? ` · ${row.vertical}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => navigate(`/app/chat?person=${row.user_id}`)}
          >
            Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => navigate(`/app/one-on-ones/prep?rep=${row.user_id}`)}
          >
            1:1
          </Button>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sales this week</dt>
          <dd className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
            {row.sales_week}
            <Spark values={row.sales_4w} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Training minutes</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">
            {row.training_week}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({delta >= 0 ? '+' : ''}
              {delta} vs last week)
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last app open</dt>
          <dd className="text-sm text-foreground">{lastOpen(row.last_active_at)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Event answers due</dt>
          <dd className="text-sm tabular-nums text-foreground">
            {row.open_rsvps > 0 ? (
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => navigate('/app/events')}
              >
                {row.open_rsvps}
              </button>
            ) : (
              0
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Setup step</dt>
          <dd className="truncate text-sm text-foreground">{row.setup_step || 'Complete'}</dd>
        </div>
      </dl>

      {row.summary_line ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Summit says: <span className="text-foreground">{row.summary_line}</span>
        </p>
      ) : null}

      {reasons.length > 0 ? (
        <p className="mt-2 text-[13px] text-foreground">{reasons.join(' · ')}</p>
      ) : null}
    </li>
  );
}

/** One screen a manager opens on Monday: who needs a conversation, and about what. */
export default function MyWeekPage() {
  const { role } = useAuth();
  const { rows, totals, scope, lastOpenedAt, loading, markOpened } = useManagerWeek();
  const [team, setTeam] = useState('all');

  useEffect(() => {
    void markOpened();
  }, [markOpened]);

  const teams = useMemo(
    () => Array.from(new Set(rows.map((r) => r.team_name || 'No team'))).sort(),
    [rows]
  );

  const shown = team === 'all' ? rows : rows.filter((r) => (r.team_name || 'No team') === team);

  const grouped = useMemo(() => {
    if (scope !== 'all') return null;
    const map = new Map<string, WeekRow[]>();
    shown.forEach((r) => {
      const key = r.team_name || 'No team';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown, scope]);

  if (!isManagerOrAbove(role)) {
    return (
      <AppLayout>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <PageHeader title="My week" context="This screen is for managers." />
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <PageHeader
          title="My week"
          context={
            loading
              ? 'Loading your reps.'
              : `${totals.reps} reps · ${totals.attention} need attention · ${totals.sales} sales · ${totals.training} training minutes`
          }
        />

        {teams.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={team === 'all' ? 'default' : 'outline'}
              size="sm"
              className="min-h-11"
              onClick={() => setTeam('all')}
            >
              All teams
            </Button>
            {teams.map((t) => (
              <Button
                key={t}
                variant={team === t ? 'default' : 'outline'}
                size="sm"
                className="min-h-11"
                onClick={() => setTeam(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reps report to you yet.</p>
        ) : grouped ? (
          grouped.map(([name, group]) => (
            <section key={name} className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">{name}</h2>
              <ul className="space-y-2">
                {group.map((r) => (
                  <Row key={r.user_id} row={r} lastOpened={lastOpenedAt} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="space-y-2">
            {shown.map((r) => (
              <Row key={r.user_id} row={r} lastOpened={lastOpenedAt} />
            ))}
          </ul>
        )}
      </main>
    </AppLayout>
  );
}
