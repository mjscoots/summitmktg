import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Target, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { verticalFilter } from '@/lib/workspaceScope';

interface Drill {
  id: string;
  category: string | null;
  scenario: string;
  model_answer: string | null;
  display_order: number;
  is_active: boolean;
}

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  audience: string;
}

const AUDIENCES = [
  { value: 'rookie', label: 'Rookies' },
  { value: 'vet', label: 'Veterans' },
  { value: 'manager', label: 'Managers' },
  { value: 'all', label: 'Everyone' },
];

export function AdminDrillsTab() {
  const { activeVertical } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newScenario, setNewScenario] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');

  const load = useCallback(async () => {
    const [drillRes, courseRes] = await Promise.all([
      supabase.from('training_drills').select('*').or(verticalFilter(activeVertical)).order('display_order').order('created_at'),
      supabase.from('training_courses').select('id, title, slug, audience').eq('is_active', true).order('display_order'),
    ]);
    if (drillRes.error) toast.error('Could not load drills.');
    setDrills((drillRes.data as Drill[]) || []);
    setCourses((courseRes.data as CourseRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDrill = async () => {
    if (newScenario.trim().length < 5) { toast.error('Write the scenario first.'); return; }
    const { error } = await supabase.from('training_drills').insert({
      vertical: activeVertical,
      scenario: newScenario.trim(),
      category: newCategory.trim() || null,
      model_answer: newModel.trim() || null,
      display_order: (drills[drills.length - 1]?.display_order ?? 0) + 1,
    });
    if (error) { toast.error('Could not add the drill.'); return; }
    setNewScenario(''); setNewCategory(''); setNewModel('');
    toast.success('Drill added');
    load();
  };

  const saveDrill = async (d: Drill) => {
    setSavingId(d.id);
    const { error } = await supabase
      .from('training_drills')
      .update({
        scenario: d.scenario,
        category: d.category,
        model_answer: d.model_answer,
        display_order: d.display_order,
        is_active: d.is_active,
      })
      .eq('id', d.id);
    setSavingId(null);
    if (error) { toast.error('Could not save the drill.'); return; }
    toast.success('Saved');
  };

  const deleteDrill = async (id: string) => {
    const { error } = await supabase.from('training_drills').delete().eq('id', id);
    if (error) { toast.error('Could not delete the drill.'); return; }
    setDrills((prev) => prev.filter((d) => d.id !== id));
  };

  const setAudience = async (courseId: string, audience: string) => {
    const { error } = await supabase.from('training_courses').update({ audience }).eq('id', courseId);
    if (error) { toast.error('Could not update the audience.'); return; }
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, audience } : c)));
    toast.success('Audience updated');
  };

  const patch = (id: string, changes: Partial<Drill>) =>
    setDrills((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)));

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Drill rotation */}
      <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">Daily drills</h3>
          <Badge variant="outline" className="text-[10px]">{drills.length} in rotation</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          One drill shows per day, rotating through this list in order. Reps see the model answer only after they answer.
        </p>

        <div className="space-y-3">
          {drills.map((d) => (
            <div key={d.id} className="rounded-lg border border-border/40 bg-surface p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={d.category || ''}
                  onChange={(e) => patch(d.id, { category: e.target.value })}
                  placeholder="Category (optional)"
                  className="h-8 text-xs bg-card/50 border-border/30 max-w-[200px]"
                />
                <Input
                  type="number"
                  value={d.display_order}
                  onChange={(e) => patch(d.id, { display_order: Number(e.target.value) })}
                  className="h-8 text-xs bg-card/50 border-border/30 w-20"
                />
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => saveDrill(d)} disabled={savingId === d.id}>
                  {savingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => deleteDrill(d.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea
                value={d.scenario}
                onChange={(e) => patch(d.id, { scenario: e.target.value })}
                placeholder="Scenario"
                className="min-h-[60px] text-sm bg-card/50 border-border/30"
              />
              <Textarea
                value={d.model_answer || ''}
                onChange={(e) => patch(d.id, { model_answer: e.target.value })}
                placeholder="Model answer (optional)"
                className="min-h-[60px] text-sm bg-card/50 border-border/30"
              />
            </div>
          ))}
          {drills.length === 0 && (
            <p className="text-sm text-muted-foreground">No drills yet. Add the first one below.</p>
          )}
        </div>

        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 space-y-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="h-8 text-xs bg-card/50 border-border/30 max-w-[200px]"
          />
          <Textarea
            value={newScenario}
            onChange={(e) => setNewScenario(e.target.value)}
            placeholder="New scenario — what does the homeowner say?"
            className="min-h-[60px] text-sm bg-card/50 border-border/30"
          />
          <Textarea
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Model answer (optional)"
            className="min-h-[60px] text-sm bg-card/50 border-border/30"
          />
          <Button size="sm" className="gap-1.5" onClick={addDrill}><Plus className="w-4 h-4" /> Add drill</Button>
        </div>
      </div>

      {/* Course audience */}
      <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">Course audience</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Controls who sees each course on the Training page.</p>
        <div className="space-y-2">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface px-3 py-2">
              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{c.title}</span>
              <Select value={c.audience || 'rookie'} onValueChange={(v) => setAudience(c.id, v)}>
                <SelectTrigger className="w-36 h-8 text-xs bg-card/50 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDrillsTab;
