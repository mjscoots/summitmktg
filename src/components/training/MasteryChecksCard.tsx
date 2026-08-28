import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Row {
  id: string;
  title: string;
  display_order: number;
  done: boolean;
}

/**
 * Pass 83 — a manager can mark a rep's chapter mastery check from the person
 * profile when they watched the pitch in person.
 */
export function MasteryChecksCard({ userId, courseSlug = 'learn-your-pitch' }: { userId: string; courseSlug?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: course } = await supabase
      .from('training_courses')
      .select('id')
      .eq('slug', courseSlug)
      .maybeSingle();
    if (!course) {
      setRows([]);
      setLoading(false);
      return;
    }
    const [{ data: mods }, checks] = await Promise.all([
      supabase
        .from('training_modules')
        .select('id, title, display_order')
        .eq('course_id', course.id)
        .eq('is_active', true)
        .order('display_order'),
      (supabase as any).from('mastery_checks').select('module_id').eq('user_id', userId),
    ]);
    const done = new Set(((checks?.data as { module_id: string }[]) || []).map((c) => c.module_id));
    setRows(((mods as { id: string; title: string; display_order: number }[]) || []).map((m) => ({ ...m, done: done.has(m.id) })));
    setLoading(false);
  }, [courseSlug, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (moduleId: string) => {
    const { error } = await (supabase as any).rpc('mark_mastery_check', {
      _module_id: moduleId,
      _user_id: userId,
      _source: 'manager',
    });
    if (error) {
      toast.error('Could not save the mastery check');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === moduleId ? { ...r, done: true } : r)));
    toast.success('Mastery check marked');
  };

  if (loading || rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex min-h-11 items-center justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate text-foreground">{r.title}</span>
            {r.done ? (
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                <Check className="h-4 w-4 text-success" /> Done
              </span>
            ) : (
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => void mark(r.id)}>
                Mark done
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MasteryChecksCard;
