import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Rank { id: string; name: string }

/** Admin-only rank override for one person. Recorded in the audit log. */
export function RankOverrideSelect({ userId }: { userId: string }) {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [current, setCurrent] = useState<string>('__none__');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [r, p] = await Promise.all([
        supabase.from('ranks').select('id, name').order('sort_order'),
        supabase.from('profiles').select('rank_id').eq('user_id', userId).maybeSingle(),
      ]);
      setRanks((r.data as Rank[]) ?? []);
      setCurrent(((p.data as any)?.rank_id as string) || '__none__');
    })();
  }, [userId]);

  const change = async (v: string) => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('admin_set_rank', {
      _user_id: userId,
      _rank_id: v === '__none__' ? null : v,
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Could not set rank');
      return;
    }
    setCurrent(v);
    toast.success('Rank updated');
  };

  return (
    <Select value={current} onValueChange={change} disabled={busy}>
      <SelectTrigger className="h-8 bg-background/70 text-xs">
        <SelectValue placeholder="Rank" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" className="text-xs">No rank (Summit)</SelectItem>
        {ranks.map((r) => (
          <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default RankOverrideSelect;
