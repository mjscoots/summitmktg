import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const KINDS = ['script', 'objection', 'close', 'talk_track', 'pricing', 'assumption'] as const;
const VERTICALS = ['Pest', 'Fiber', 'Life'] as const;

interface Row {
  id: string;
  vertical: string;
  kind: string;
  title: string;
  body: string;
  followup: string | null;
  tags: string[] | null;
  sort_order: number;
  published: boolean;
  updated_by: string | null;
  updated_at: string;
}

const CARD = 'rounded-[10px] border border-border bg-card p-3';

/** Admin editor for the field playbook, one industry at a time. */
export function AdminPlaybookTab() {
  const { user } = useAuth();
  const [vertical, setVertical] = useState<string>('Pest');
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('playbook_entries')
      .select('id, vertical, kind, title, body, followup, tags, sort_order, published, updated_by, updated_at')
      .eq('vertical', vertical)
      .order('kind')
      .order('sort_order');
    if (error) toast.error('Could not load the playbook');
    const list = (data as Row[]) || [];
    setRows(list);
    const editors = Array.from(new Set(list.map((r) => r.updated_by).filter(Boolean))) as string[];
    if (editors.length > 0) {
      const { data: people } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', editors);
      setNames(Object.fromEntries((people || []).map((p) => [p.user_id, p.full_name || 'Someone'])));
    }
    setLoading(false);
  }, [vertical]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (id: string, changes: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const save = async (row: Row) => {
    setBusy(row.id);
    const { error } = await (supabase as any)
      .from('playbook_entries')
      .update({
        title: row.title,
        body: row.body,
        followup: row.followup,
        tags: row.tags ?? [],
        sort_order: row.sort_order,
        published: row.published,
        kind: row.kind,
        vertical: row.vertical,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    setBusy(null);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Saved');
    void load();
  };

  const add = async () => {
    const { error } = await (supabase as any).from('playbook_entries').insert({
      vertical,
      kind: 'objection',
      title: 'New entry',
      body: '',
      sort_order: rows.length + 1,
      published: false,
      updated_by: user?.id ?? null,
    });
    if (error) { toast.error('Could not add an entry'); return; }
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('playbook_entries').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={vertical} onValueChange={setVertical}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="min-h-11" onClick={add}>
          <Plus className="mr-1.5 h-4 w-4" /> Add entry
        </Button>
        <span className="text-[13px] text-muted-foreground">{rows.length} entries</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No playbook entries for {vertical} yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const isOpen = openId === r.id;
            return (
              <div key={r.id} className={CARD}>
                <button
                  className="flex min-h-11 w-full items-center gap-3 text-left"
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{r.kind}</span>
                  <span className={cn('shrink-0 text-[12px]', r.published ? 'text-muted-foreground' : 'text-destructive')}>
                    {r.published ? 'Published' : 'Hidden'}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <Input value={r.title} onChange={(e) => patch(r.id, { title: e.target.value })} />
                    <div className="flex flex-wrap gap-2">
                      <Select value={r.kind} onValueChange={(v) => patch(r.id, { kind: v })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={r.vertical} onValueChange={(v) => patch(r.id, { vertical: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-24"
                        value={r.sort_order}
                        onChange={(e) => patch(r.id, { sort_order: Number(e.target.value) })}
                        aria-label="Order"
                      />
                    </div>
                    <Textarea
                      rows={6}
                      value={r.body}
                      onChange={(e) => patch(r.id, { body: e.target.value })}
                      placeholder="Body"
                    />
                    <Textarea
                      rows={4}
                      value={r.followup || ''}
                      onChange={(e) => patch(r.id, { followup: e.target.value })}
                      placeholder="Follow-up"
                    />
                    <Input
                      value={(r.tags || []).join(', ')}
                      onChange={(e) =>
                        patch(r.id, {
                          tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Tags, comma separated"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button className="min-h-11" onClick={() => void save(r)} disabled={busy === r.id}>
                        {busy === r.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => void save({ ...r, published: !r.published })}
                      >
                        {r.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="outline" className="min-h-11" onClick={() => void remove(r.id)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Last edited {new Date(r.updated_at).toLocaleString()}
                      {r.updated_by ? ` by ${names[r.updated_by] || 'someone'}` : ''}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPlaybookTab;
