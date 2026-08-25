import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ActionItemSource = 'manager-meeting' | 'one-on-one' | 'manual';

export interface ActionItem {
  id: string;
  title: string;
  assigned_to: string;
  created_by: string | null;
  due_date: string | null;
  source: string;
  status: string;
  created_at: string;
}

const SELECT = 'id, title, assigned_to, created_by, due_date, source, status, created_at';

/** Open action items for one person (defaults to the signed-in user). */
export function useActionItems(userId?: string | null) {
  const { user } = useAuth();
  const target = userId ?? user?.id ?? null;
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!target) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('action_items')
      .select(SELECT)
      .eq('assigned_to', target)
      .eq('status', 'open')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) console.error('action_items load failed:', error.message);
    setItems((data as ActionItem[]) ?? []);
    setLoading(false);
  }, [target]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const complete = useCallback(
    async (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      const { error } = await supabase
        .from('action_items')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        toast.error('Could not check that off');
        void refresh();
      }
    },
    [refresh]
  );

  return { items, loading, refresh, complete };
}

/** Create one action item. Returns true on success. */
export async function createActionItem(input: {
  title: string;
  assigned_to: string;
  created_by: string;
  due_date?: string | null;
  source: ActionItemSource;
}): Promise<boolean> {
  const title = input.title.trim();
  if (!title) return false;
  const { error } = await supabase.from('action_items').insert({
    title,
    assigned_to: input.assigned_to,
    created_by: input.created_by,
    due_date: input.due_date || null,
    source: input.source,
  });
  if (error) {
    console.error('action_items insert failed:', error.message);
    toast.error('Could not save that action item');
    return false;
  }
  return true;
}
