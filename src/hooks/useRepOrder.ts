import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PrepRep } from '@/hooks/useOneOnOnePrep';

export function useRepOrder(managerId: string | undefined, reps: PrepRep[]) {
  const [orderedReps, setOrderedReps] = useState<PrepRep[]>(reps);
  const [customOrderLoaded, setCustomOrderLoaded] = useState(false);

  // Load saved order from DB
  useEffect(() => {
    if (!managerId || reps.length === 0) {
      setOrderedReps(reps);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('one_on_one_rep_order')
        .select('rep_user_id, display_order')
        .eq('manager_id', managerId)
        .order('display_order', { ascending: true });

      if (cancelled) return;

      if (data && data.length > 0) {
        const orderMap = new Map(data.map(d => [d.rep_user_id, d.display_order]));
        const inOrder = data
          .map(d => reps.find(r => r.user_id === d.rep_user_id))
          .filter(Boolean) as PrepRep[];
        const newReps = reps.filter(r => !orderMap.has(r.user_id));
        setOrderedReps([...inOrder, ...newReps]);
      } else {
        setOrderedReps(reps);
      }
      setCustomOrderLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [managerId, reps]);

  const saveOrder = useCallback(async (ordered: PrepRep[]) => {
    if (!managerId) return;

    // Delete then insert
    await supabase
      .from('one_on_one_rep_order')
      .delete()
      .eq('manager_id', managerId);

    const records = ordered.map((rep, i) => ({
      manager_id: managerId,
      rep_user_id: rep.user_id,
      display_order: i,
    }));

    if (records.length > 0) {
      await supabase.from('one_on_one_rep_order').insert(records);
    }
  }, [managerId]);

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setOrderedReps(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      saveOrder(updated);
      return updated;
    });
  }, [saveOrder]);

  const resetToDefault = useCallback(async () => {
    const sorted = [...reps].sort((a, b) => a.full_name.localeCompare(b.full_name));
    setOrderedReps(sorted);
    await saveOrder(sorted);
  }, [reps, saveOrder]);

  return { orderedReps, reorder, resetToDefault, customOrderLoaded };
}
