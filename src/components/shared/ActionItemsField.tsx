import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Plus, Trash2 } from 'lucide-react';
import { createActionItem, ActionItem, ActionItemSource } from '@/hooks/useActionItems';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Assignee {
  user_id: string;
  full_name: string;
}

interface Props {
  source: ActionItemSource;
  /** People this manager can assign to. When only one, the picker is hidden. */
  assignees: Assignee[];
  /** Pre-selected assignee (used by the 1:1 form). */
  defaultAssignee?: string;
  className?: string;
}

/**
 * Inline action-item editor used by the Weekly Manager Meeting and 1:1 forms.
 * Every row it creates is a real tracked item — the assignee sees it on Home.
 */
export function ActionItemsField({ source, assignees, defaultAssignee, className }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee ?? assignees[0]?.user_id ?? '');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultAssignee) setAssignee(defaultAssignee);
    else if (!assignee && assignees[0]) setAssignee(assignees[0].user_id);
  }, [defaultAssignee, assignees, assignee]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('action_items')
      .select('id, title, assigned_to, created_by, due_date, source, status, created_at')
      .eq('created_by', user.id)
      .eq('source', source)
      .eq('status', 'open')
      .order('created_at', { ascending: true });
    setItems((data as ActionItem[]) ?? []);
  }, [user?.id, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      toast.error('Add a title first');
      return;
    }
    if (!assignee) {
      toast.error('Pick who owns it');
      return;
    }
    setSaving(true);
    const ok = await createActionItem({
      title,
      assigned_to: assignee,
      created_by: user.id,
      due_date: due || null,
      source,
    });
    setSaving(false);
    if (ok) {
      setTitle('');
      setDue('');
      await load();
    }
  };

  const finish = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase
      .from('action_items')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id);
  };

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('action_items').delete().eq('id', id);
  };

  const nameFor = (id: string) =>
    getDisplayName(assignees.find(a => a.user_id === id)?.full_name ?? 'Assigned');

  return (
    <div className={cn('space-y-3', className)}>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(i => (
            <li
              key={i.id}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <button
                onClick={() => finish(i.id)}
                aria-label="Mark done"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{i.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {nameFor(i.assigned_to)}
                  {i.due_date ? ` · due ${i.due_date}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Action item"
          className="flex-1"
        />
        {assignees.length > 1 && (
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="min-h-10 rounded-md border border-white/[0.08] bg-card/50 px-3 text-sm text-foreground sm:max-w-[190px]"
          >
            {assignees.map(a => (
              <option key={a.user_id} value={a.user_id}>
                {getDisplayName(a.full_name)}
              </option>
            ))}
          </select>
        )}
        <Input
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          className="sm:max-w-[160px]"
        />
        <Button onClick={add} disabled={saving} variant="outline" size="sm" className="sm:self-stretch">
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
      {assignees.length === 0 && (
        <p className="text-xs text-muted-foreground">No one to assign to yet.</p>
      )}
    </div>
  );
}
