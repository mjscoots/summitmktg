import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useManagerWeek } from '@/hooks/useManagerWeek';

/**
 * The numbers and notes this rep's week already produced, so the manager does
 * not have to open five screens before the 1:1.
 */
export function WeekContextCard({ userId }: { userId: string }) {
  const { rows, loading } = useManagerWeek();
  const [threads, setThreads] = useState<string[]>([]);
  const row = rows.find((r) => r.user_id === userId) || null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from('assistant_threads')
        .select('title, last_at')
        .eq('user_id', userId)
        .order('last_at', { ascending: false })
        .limit(3);
      if (!cancelled) {
        setThreads(((data as { title: string | null }[]) || []).map((t) => t.title || 'Untitled').slice(0, 3));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || !row) return null;

  return (
    <section className="rounded-[10px] border border-border bg-card p-3 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">This week</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Sales', value: String(row.sales_week) },
          { label: 'Training minutes', value: String(row.training_week) },
          { label: 'Last week minutes', value: String(row.training_prev) },
          { label: 'Event answers due', value: String(row.open_rsvps) },
        ].map((c) => (
          <div key={c.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</dt>
            <dd className="text-base font-semibold tabular-nums text-foreground">{c.value}</dd>
          </div>
        ))}
      </dl>

      {row.summary_line ? (
        <p className="text-[13px] text-muted-foreground">
          Summit says: <span className="text-foreground">{row.summary_line}</span>
        </p>
      ) : null}

      {row.concerns.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Concerns</p>
          <ul className="list-disc pl-5 text-[13px] text-foreground">
            {row.concerns.slice(0, 4).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.goals ? (
        <p className="text-[13px] text-muted-foreground">
          Goals: <span className="text-foreground">{row.goals}</span>
        </p>
      ) : null}

      {threads.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Ask Summit questions
          </p>
          <ul className="list-disc pl-5 text-[13px] text-foreground">
            {threads.map((t) => (
              <li key={t} className="truncate">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.setup_step ? (
        <p className="text-[13px] text-muted-foreground">
          Next setup step: <span className="text-foreground">{row.setup_step}</span>
        </p>
      ) : null}
    </section>
  );
}
