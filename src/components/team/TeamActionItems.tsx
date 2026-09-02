import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { Check, ListChecks, Loader2 } from 'lucide-react';

interface Row {
  id: string;
  title: string;
  assigned_to: string;
  due_date: string | null;
  source: string;
}

/** All open action items across the team - managers+ view on the Team page. */
export function TeamActionItems() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('action_items')
      .select('id, title, assigned_to, due_date, source')
      .eq('status', 'open')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    const list = (data ?? []) as Row[];
    setRows(list);

    const ids = [...new Set(list.map(r => r.assigned_to))];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach(p => {
        map[p.user_id] = getDisplayName(p.full_name);
      });
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    await supabase
      .from('action_items')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/25">
          <ListChecks className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Open action items</h2>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing open right now.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {rows.map(r => {
            const overdue = r.due_date && r.due_date < today;
            return (
              <li key={r.id} className="flex items-center gap-2.5 py-2.5">
                <button
                  onClick={() => finish(r.id)}
                  aria-label={`Mark "${r.title}" done`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {names[r.assigned_to] ?? 'Unknown'} · {r.source}
                  </p>
                </div>
                {r.due_date && (
                  <span
                    className={cn(
                      'shrink-0 text-[11px]',
                      overdue ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {overdue ? 'Overdue' : r.due_date.slice(5)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
