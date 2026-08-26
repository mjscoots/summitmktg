import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { GitBranch } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface Rung {
  id: string;
  rung: number;
  title: string;
  description: string | null;
}

/** Admin editing for the career ladder copy and graduation thresholds. */
export default function AdminLadderSettings() {
  const [rungs, setRungs] = useState<Rung[]>([]);
  const [note, setNote] = useState('');
  const [minSeasons, setMinSeasons] = useState('1');
  const [minYear, setMinYear] = useState('2');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('ladder_rungs').select('id, rung, title, description').order('rung'),
      supabase.from('app_settings').select('key, value')
        .in('key', ['ladder_timeline_note', 'graduation_min_seasons', 'graduation_min_rep_year']),
    ]);
    setRungs((r as Rung[]) || []);
    const map = new Map(((s as { key: string; value: string }[]) || []).map((x) => [x.key, x.value]));
    setNote(map.get('ladder_timeline_note') || '');
    setMinSeasons(map.get('graduation_min_seasons') || '1');
    setMinYear(map.get('graduation_min_rep_year') || '2');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    const errs: string[] = [];
    for (const r of rungs) {
      const { error } = await supabase
        .from('ladder_rungs')
        .update({ title: r.title.trim().slice(0, 80), description: (r.description || '').trim().slice(0, 300) || null })
        .eq('id', r.id);
      if (error) errs.push(error.message);
    }
    for (const [key, value] of [
      ['ladder_timeline_note', note.trim().slice(0, 200)],
      ['graduation_min_seasons', String(Math.max(0, Number(minSeasons) || 0))],
      ['graduation_min_rep_year', String(Math.max(1, Number(minYear) || 1))],
    ]) {
      const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) errs.push(error.message);
    }
    setBusy(false);
    if (errs.length) {
      toast({ title: 'Could not save', description: errs[0], variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
    load();
  };

  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <GitBranch className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Career ladder</h3>
          <p className="text-[12px] text-muted-foreground">Rung copy and who can apply to run a team.</p>
        </div>
      </div>

      <div className="space-y-2">
        {rungs.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/50 bg-surface p-3">
            <p className="micro-label tabular-nums">Rung {r.rung}</p>
            <Input
              className="mt-1.5 h-9 text-[13px]"
              value={r.title}
              onChange={(e) =>
                setRungs((prev) => prev.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))
              }
            />
            <Textarea
              className="mt-2 min-h-[60px] text-[13px]"
              value={r.description || ''}
              onChange={(e) =>
                setRungs((prev) => prev.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">Timeline note</label>
          <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} className="h-9 text-[13px]" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Seasons completed</label>
            <Input
              type="number"
              min={0}
              value={minSeasons}
              onChange={(e) => setMinSeasons(e.target.value)}
              className="h-9 w-[120px] text-[13px] tabular-nums"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Minimum rep year</label>
            <Input
              type="number"
              min={1}
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              className="h-9 w-[120px] text-[13px] tabular-nums"
            />
          </div>
        </div>
        <Button size="sm" disabled={busy} onClick={save}>Save ladder</Button>
      </div>
    </div>
  );
}
