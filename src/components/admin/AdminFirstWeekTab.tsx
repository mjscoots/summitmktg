import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

interface DayRow {
  id: string;
  vertical: string;
  day: number;
  title: string;
  items: unknown;
  published: boolean;
}

const VERTICALS = ['Pest', 'Fiber', 'Life'];

/** Editor for the seven day first week plan, one industry at a time. */
export function AdminFirstWeekTab() {
  const [vertical, setVertical] = useState('Pest');
  const [rows, setRows] = useState<DayRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('onboarding_days')
      .select('id, vertical, day, title, items, published')
      .eq('vertical', vertical)
      .order('day');
    if (error) toast.error('Could not load the first week plan');
    const list = (data as DayRow[]) || [];
    setRows(list);
    setDrafts(
      Object.fromEntries(list.map((r) => [r.id, JSON.stringify(r.items ?? [], null, 2)]))
    );
    setLoading(false);
  }, [vertical]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, fields: Record<string, unknown>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...(fields as Partial<DayRow>) } : r)));
    const { error } = await (supabase as any)
      .from('onboarding_days')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('That did not save');
  }

  async function saveItems(row: DayRow) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(drafts[row.id] || '[]');
    } catch {
      toast.error('The items list is not valid JSON');
      return;
    }
    if (!Array.isArray(parsed)) {
      toast.error('The items list must be a list');
      return;
    }
    await patch(row.id, { items: parsed });
    toast.success(`Day ${row.day} saved`);
  }

  async function addDay() {
    const next = Math.max(0, ...rows.map((r) => r.day)) + 1;
    if (next > 7) {
      toast.error('The plan holds seven days');
      return;
    }
    const { error } = await (supabase as any)
      .from('onboarding_days')
      .insert({ vertical, day: next, title: `Day ${next}`, items: [], published: false });
    if (error) {
      toast.error('Could not add that day');
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {VERTICALS.map((v) => (
          <Button
            key={v}
            variant={vertical === v ? 'default' : 'outline'}
            size="sm"
            className="min-h-11"
            onClick={() => setVertical(v)}
          >
            {v}
          </Button>
        ))}
        <Button variant="outline" size="sm" className="min-h-11" onClick={() => void addDay()}>
          Add a day
        </Button>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Each day holds a short list of items. An item has a key, a label, and a rule that decides
        when it completes: profile, chat_message, sale, events_clear, threads:2,
        drills:Objections:3, self (the rep checks it), or mark (the manager marks it).
      </p>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No first week plan for {vertical} yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 rounded-[10px] border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] tabular-nums text-muted-foreground">Day {r.day}</span>
                <Input
                  value={r.title}
                  onChange={(e) => patch(r.id, { title: e.target.value })}
                  className="h-11 flex-1 min-w-[180px]"
                />
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  Published
                  <Switch
                    checked={r.published}
                    onCheckedChange={(v) => patch(r.id, { published: v })}
                  />
                </label>
              </div>
              <Textarea
                value={drafts[r.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                rows={8}
                className="font-mono text-[12px]"
              />
              <Button size="sm" className="min-h-11" onClick={() => void saveItems(r)}>
                Save day {r.day}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminFirstWeekTab;
