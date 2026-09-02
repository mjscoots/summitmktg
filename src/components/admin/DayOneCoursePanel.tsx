import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface VideoRow {
  id: string;
  title: string;
  category: string | null;
}

/**
 * Pass 119 - owner and admin pick which existing training videos make up the
 * day-one watch course, and in what order. No content is created here.
 */
export default function DayOneCoursePanel() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState('');

  const load = useCallback(async () => {
    const [videoRes, settingRes] = await Promise.all([
      supabase.from('training_videos').select('id, title, category').eq('is_active', true).order('title'),
      supabase.from('app_settings').select('value').eq('key', 'day_one_video_ids').maybeSingle(),
    ]);
    setVideos((videoRes.data || []) as VideoRow[]);
    const raw = settingRes.data?.value || '';
    setIds(raw.split(',').map((s) => s.trim()).filter(Boolean));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const available = videos.filter((v) => !ids.includes(v.id));

  const move = (index: number, delta: number) => {
    const next = [...ids];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setIds(next);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).rpc('set_day_one_items', { _video_ids: ids });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save the day-one course', variant: 'destructive' });
      return;
    }
    toast({ title: 'Day-one course saved' });
    void load();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Day one watch course</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        New recruits watch these videos, in this order, before the app opens.
      </p>

      <ol className="mt-4 space-y-2">
        {ids.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-3 py-2"
          >
            <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {byId.get(id)?.title || 'Video no longer available'}
              {byId.get(id)?.category ? (
                <span className="text-muted-foreground"> · {byId.get(id)?.category}</span>
              ) : null}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Move up"
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Move down"
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Remove"
              onClick={() => setIds(ids.filter((x) => x !== id))}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {!ids.length && <li className="text-sm text-muted-foreground">No videos selected yet.</li>}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">Add a video</option>
          {available.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
              {v.category ? ` · ${v.category}` : ''}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!pick}
          onClick={() => {
            if (!pick) return;
            setIds([...ids, pick]);
            setPick('');
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
        <Button className="min-h-11" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving' : 'Save order'}
        </Button>
      </div>
    </section>
  );
}
