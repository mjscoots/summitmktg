import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, ShieldCheck, Users,
} from 'lucide-react';
import AdminLadderSettings from '@/components/admin/AdminLadderSettings';


const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface PathRow {
  vertical: string;
  label: string;
  description: string | null;
  is_configured: boolean;
  display_order: number;
}

interface StepRow {
  id: string;
  vertical: string;
  display_order: number;
  title: string;
  description: string | null;
  step_type: 'task' | 'upload' | 'training' | 'approval';
  course_id: string | null;
  is_active: boolean;
}

interface CourseRow {
  id: string;
  title: string;
}

interface EnrollRow {
  user_id: string;
  full_name: string | null;
  vertical: string;
  label: string;
  status: string;
  current_step: number;
  steps_total: number;
  steps_done: number;
  paired_manager: string | null;
  updated_at: string;
}

interface PendingRow {
  user_id: string;
  full_name: string | null;
  vertical: string;
  label: string;
  step_id: string;
  step_title: string;
}

const STEP_TYPES: StepRow['step_type'][] = ['task', 'upload', 'training', 'approval'];

interface Props {
  /** When set, only this vertical's path is shown and cross-industry sections are hidden. */
  restrictToVertical?: string;
}

export default function AdminIndustriesTab({ restrictToVertical }: Props = {}) {
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<PathRow>>>({});

  const load = useCallback(async () => {
    const [p, s, c, e, pa] = await Promise.all([
      supabase.from('vertical_paths' as never).select('*').order('display_order'),
      supabase.from('vertical_steps' as never).select('*').order('display_order'),
      supabase.from('training_courses').select('id, title').eq('is_active', true).order('display_order'),
      supabase.rpc('get_vertical_enrollments' as never),
      supabase.rpc('get_pending_vertical_approvals' as never),
    ]);
    setPaths((p.data as unknown as PathRow[]) || []);
    setSteps((s.data as unknown as StepRow[]) || []);
    setCourses((c.data as unknown as CourseRow[]) || []);
    setEnrollments(((e.data as unknown as { rows: EnrollRow[] })?.rows) || []);
    setPending(((pa.data as unknown as { rows: PendingRow[] })?.rows) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePath = async (v: string) => {
    const patch = drafts[v];
    if (!patch) return;
    setBusy(v);
    const { error } = await supabase.from('vertical_paths' as never).update(patch as never).eq('vertical', v);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[v];
      return next;
    });
    load();
  };

  const addStep = async (vertical: string) => {
    const max = steps.filter((s) => s.vertical === vertical).reduce((m, s) => Math.max(m, s.display_order), 0);
    setBusy(`add-${vertical}`);
    const { error } = await supabase.from('vertical_steps' as never).insert({
      vertical,
      display_order: max + 1,
      title: 'New step',
      step_type: 'task',
    } as never);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not add step', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const patchStep = async (id: string, patch: Partial<StepRow>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await supabase.from('vertical_steps' as never).update(patch as never).eq('id', id);
    if (error) toast({ title: 'Could not save step', description: error.message, variant: 'destructive' });
  };

  const removeStep = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from('vertical_steps' as never).delete().eq('id', id);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not delete step', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const move = async (step: StepRow, dir: -1 | 1) => {
    const list = steps.filter((s) => s.vertical === step.vertical).sort((a, b) => a.display_order - b.display_order);
    const idx = list.findIndex((s) => s.id === step.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await Promise.all([
      patchStep(step.id, { display_order: swap.display_order }),
      patchStep(swap.id, { display_order: step.display_order }),
    ]);
    load();
  };

  const approve = async (row: PendingRow) => {
    setBusy(row.step_id + row.user_id);
    const { data, error } = await supabase.rpc('approve_vertical_step' as never, {
      _user_id: row.user_id,
      _step_id: row.step_id,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not approve', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const visiblePaths = restrictToVertical ? paths.filter((p) => p.vertical === restrictToVertical) : paths;

  return (
    <div className="space-y-5">
      {!restrictToVertical && <AdminLadderSettings />}

      {/* Path builder */}

      {visiblePaths.map((p) => {
        const mine = steps.filter((s) => s.vertical === p.vertical).sort((a, b) => a.display_order - b.display_order);
        const draft = drafts[p.vertical] || {};
        const dirty = Object.keys(draft).length > 0;
        return (
          <div key={p.vertical} className={CARD}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{p.label}</h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  p.is_configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
                )}
              >
                {p.is_configured ? 'Live' : 'Not configured'}
              </span>
              {!p.is_configured && (
                <span className="text-[12px] text-muted-foreground">
                  Add the real steps, then mark it live.
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[12px]">Description shown to reps</Label>
              <Textarea
                rows={3}
                value={draft.description ?? p.description ?? ''}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [p.vertical]: { ...d[p.vertical], description: e.target.value } }))
                }
                placeholder="One plain paragraph."
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={draft.is_configured ?? p.is_configured}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [p.vertical]: { ...d[p.vertical], is_configured: e.target.checked },
                      }))
                    }
                  />
                  Setup steps are finalized (reps can start)
                </label>
                <Button size="sm" disabled={!dirty || busy === p.vertical} onClick={() => savePath(p.vertical)}>
                  {busy === p.vertical ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="ml-1.5">Save</span>
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {mine.map((s, i) => (
                <div key={s.id} className="rounded-lg border border-border/50 bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] tabular-nums text-muted-foreground">{s.display_order}</span>
                    <Input
                      className="h-8 min-w-[160px] flex-1 text-[13px]"
                      value={s.title}
                      onChange={(e) => setSteps((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                      onBlur={(e) => patchStep(s.id, { title: e.target.value })}
                    />
                    <Select
                      value={s.step_type}
                      onValueChange={(val) => patchStep(s.id, { step_type: val as StepRow['step_type'] })}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {s.step_type === 'training' && (
                      <Select
                        value={s.course_id || 'none'}
                        onValueChange={(val) => patchStep(s.id, { course_id: val === 'none' ? null : val })}
                      >
                        <SelectTrigger className="h-8 w-[180px] text-[12px]">
                          <SelectValue placeholder="Course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No course</SelectItem>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(s, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === mine.length - 1} onClick={() => move(s, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={busy === s.id} onClick={() => removeStep(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="mt-2 h-8 text-[12px]"
                    placeholder="Description (optional)"
                    value={s.description || ''}
                    onChange={(e) => setSteps((prev) => prev.map((x) => (x.id === s.id ? { ...x, description: e.target.value } : x)))}
                    onBlur={(e) => patchStep(s.id, { description: e.target.value || null })}
                  />
                </div>
              ))}
              {mine.length === 0 && <p className="text-[13px] text-muted-foreground">No steps yet.</p>}
              <Button size="sm" variant="secondary" disabled={busy === `add-${p.vertical}`} onClick={() => addStep(p.vertical)}>
                <Plus className="h-4 w-4" /> <span className="ml-1.5">Add step</span>
              </Button>
            </div>
          </div>
        );
      })}

      {/* Pending approvals */}
      <div className={CARD}>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Waiting on sign-off</h3>
        </div>
        {pending.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.user_id + r.step_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-surface px-3 py-2">
                <span className="text-[13px] font-medium text-foreground">{r.full_name || '—'}</span>
                <span className="text-[12px] text-muted-foreground">{r.label} · {r.step_title}</span>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={busy === r.step_id + r.user_id}
                  onClick={() => approve(r)}
                >
                  Sign off
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Enrollments */}
      <div className={CARD}>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Enrollments</h3>
        </div>
        {enrollments.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3">Rep</th>
                  <th className="pb-2 pr-3">Industry</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Progress</th>
                  <th className="pb-2 pr-3">Paired manager</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((r) => (
                  <tr key={r.user_id + r.vertical} className="border-t border-border/40">
                    <td className="py-2 pr-3 text-foreground">{r.full_name || '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.label}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.status}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                      {r.steps_done}/{r.steps_total}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.paired_manager || '—'}</td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {new Date(r.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
