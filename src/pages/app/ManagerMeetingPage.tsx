import { useEffect, useMemo, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, AlertCircle, ClipboardList, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

// ───────────────────── Types ─────────────────────
type RepStatus = 'cut' | 'watch' | 'help' | 'promote';
interface RepRow { id: string; name: string; status: RepStatus; note: string }
interface RuleRow { id: string; rule: string; enforcement: string }
interface RoleRow { id: string; role: string; assignee: string; show_time: string; expectations: string; improvement: string; locked?: boolean }
interface ManagerRow { id: string; name: string; compliment: string; critique: string }
interface CarGroupRow { id: string; group_name: string; riders: string; area: string }

interface FormData {
  last_week_accountability: string;
  last_week_goal: string;
  last_week_actual: string;
  last_week_pct: string;
  wins: string;
  reps: RepRow[];
  rules: RuleRow[];
  office_issues: string;
  roles: RoleRow[];
  managers: ManagerRow[];
  weekend_planner: string;
  weekend_idea: string;
  car_groups: CarGroupRow[];
  team_goal: string;
  action_items: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultData = (): FormData => ({
  last_week_accountability: '',
  last_week_goal: '',
  last_week_actual: '',
  last_week_pct: '',
  wins: '',
  reps: [],
  rules: [],
  office_issues: '',
  roles: [
    { id: uid(), role: 'Host', assignee: '', show_time: '', expectations: '', improvement: '', locked: true },
    { id: uid(), role: 'DJ', assignee: '', show_time: '', expectations: '', improvement: '', locked: true },
    { id: uid(), role: 'Breakdown Lead', assignee: '', show_time: '', expectations: '', improvement: '', locked: true },
    { id: uid(), role: 'Training Lead — Morning', assignee: '', show_time: '', expectations: '', improvement: '' },
    { id: uid(), role: 'Training Lead — Afternoon', assignee: '', show_time: '', expectations: '', improvement: '' },
  ],
  managers: [],
  weekend_planner: '',
  weekend_idea: '',
  car_groups: [],
  team_goal: '',
  action_items: '',
});

const statusMeta: Record<RepStatus, { label: string; ring: string; chip: string; bar: string }> = {
  cut:     { label: 'Cut',              ring: 'border-red-500/40',    chip: 'bg-red-500/15 text-red-300 border-red-500/30',     bar: 'bg-gradient-to-b from-red-500 to-red-600' },
  watch:   { label: 'Watch',            ring: 'border-amber-500/40',  chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', bar: 'bg-gradient-to-b from-amber-400 to-amber-600' },
  help:    { label: 'Needs Help',       ring: 'border-blue-500/40',   chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30',   bar: 'bg-gradient-to-b from-blue-400 to-blue-600' },
  promote: { label: 'Promote/Spotlight',ring: 'border-emerald-500/40',chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'bg-gradient-to-b from-emerald-400 to-emerald-600' },
};

// ───────────────────── Section Card ─────────────────────
function SectionCard({ n, title, subtitle, children }: { n: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-white/[0.06] overflow-hidden">
      <div className="flex items-start gap-4 px-5 sm:px-6 py-5 border-b border-white/[0.04]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">{n}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6 space-y-4">{children}</div>
    </div>
  );
}

// ───────────────────── Page ─────────────────────
export default function ManagerMeetingPage() {
  const { user, role, isLoading } = useAuth();
  const [weekOf, setWeekOf] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [data, setData] = useState<FormData>(defaultData());
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [datePopOpen, setDatePopOpen] = useState(false);

  const weekKey = useMemo(() => format(weekOf, 'yyyy-MM-dd'), [weekOf]);

  // Load existing submission
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: row, error } = await supabase
        .from('manager_meeting_submissions')
        .select('id, data')
        .eq('user_id', user.id)
        .eq('week_of', weekKey)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error('Could not load submission');
      }
      if (row) {
        setExistingId(row.id);
        setData({ ...defaultData(), ...((row.data as any) || {}) });
      } else {
        setExistingId(null);
        setData(defaultData());
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, weekKey]);

  const update = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => setData(d => ({ ...d, [k]: v })), []);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      week_of: weekKey,
      data: data as any,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from('manager_meeting_submissions')
      .upsert(payload, { onConflict: 'user_id,week_of' })
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Failed to save: ' + error.message);
      return;
    }
    if (row) setExistingId(row.id);
    toast.success(existingId ? 'Meeting updated' : 'Meeting submitted');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (role !== 'manager' && role !== 'admin' && role !== 'owner') {
    return (
      <AppLayout>
        <main className="max-w-3xl mx-auto px-4 py-12 text-muted-foreground">Not authorized.</main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32">
        <PageBackButton to="/app/forms" label="Forms" />

        {/* Hero */}
        <div className="flex items-start gap-4 mb-8">
          <div className="relative mt-0.5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-400/20 blur-xl" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-blue-500/15 border border-primary/20 flex items-center justify-center shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-none">Weekly Manager Meeting</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Structured weekly recap, assignments, and accountability</p>
          </div>
        </div>

        {/* Status bar */}
        <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-white/[0.06] p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Popover open={datePopOpen} onOpenChange={setDatePopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 border-white/10 bg-white/[0.02]">
                  <CalendarIcon className="w-4 h-4" />
                  Week of {format(weekOf, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={weekOf}
                  onSelect={(d) => {
                    if (d) {
                      setWeekOf(startOfWeek(d, { weekStartsOn: 1 }));
                      setDatePopOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</span>
            ) : existingId ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted this week
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" /> Not submitted yet
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 1 Accountability */}
          <SectionCard n={1} title="Last Week's Accountability" subtitle="Whether last week's rules, roles, and activity were completed. Goal vs. actual.">
            <div className="space-y-2">
              <Label>Recap</Label>
              <Textarea rows={4} value={data.last_week_accountability} onChange={(e) => update('last_week_accountability', e.target.value)} placeholder="What was completed, what slipped, and who owned it" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Goal</Label><Input value={data.last_week_goal} onChange={(e) => update('last_week_goal', e.target.value)} placeholder="Goal" /></div>
              <div><Label>Actual</Label><Input value={data.last_week_actual} onChange={(e) => update('last_week_actual', e.target.value)} placeholder="Actual" /></div>
              <div><Label>% to goal</Label><Input value={data.last_week_pct} onChange={(e) => update('last_week_pct', e.target.value)} placeholder="e.g. 87%" /></div>
            </div>
          </SectionCard>

          {/* 2 Wins */}
          <SectionCard n={2} title="Wins of the Week" subtitle="What went well this week.">
            <Textarea rows={5} value={data.wins} onChange={(e) => update('wins', e.target.value)} placeholder="" />
          </SectionCard>

          {/* 3 Rep Triage */}
          <SectionCard n={3} title="Rep Triage" subtitle="Tag each rep: Cut, Watch, Needs Help, or Promote.">
            <div className="space-y-3">
              {data.reps.map((r) => {
                const m = statusMeta[r.status];
                return (
                  <div key={r.id} className={cn('relative rounded-xl border bg-white/[0.02] p-3 pl-4 flex flex-col sm:flex-row gap-3', m.ring)}>
                    <div className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r', m.bar)} />
                    <Input className="sm:max-w-[200px]" placeholder="Rep name" value={r.name} onChange={(e) => update('reps', data.reps.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                    <Select value={r.status} onValueChange={(v) => update('reps', data.reps.map(x => x.id === r.id ? { ...x, status: v as RepStatus } : x))}>
                      <SelectTrigger className={cn('sm:max-w-[180px]', m.chip)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusMeta) as RepStatus[]).map(s => <SelectItem key={s} value={s}>{statusMeta[s].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="flex-1" placeholder="Note" value={r.note} onChange={(e) => update('reps', data.reps.map(x => x.id === r.id ? { ...x, note: e.target.value } : x))} />
                    <Button variant="ghost" size="icon" onClick={() => update('reps', data.reps.filter(x => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => update('reps', [...data.reps, { id: uid(), name: '', status: 'watch', note: '' }])}><Plus className="w-4 h-4 mr-1" /> Add rep</Button>
            </div>
          </SectionCard>

          {/* 4 Constitutional Rules */}
          <SectionCard n={4} title="Constitutional Rules" subtitle="Rules to implement or reinforce, with enforcement.">
            <div className="space-y-3">
              {data.rules.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col sm:flex-row gap-3">
                  <Input className="sm:max-w-[260px]" placeholder="Rule" value={r.rule} onChange={(e) => update('rules', data.rules.map(x => x.id === r.id ? { ...x, rule: e.target.value } : x))} />
                  <Input className="flex-1" placeholder="Enforcement or consequence" value={r.enforcement} onChange={(e) => update('rules', data.rules.map(x => x.id === r.id ? { ...x, enforcement: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => update('rules', data.rules.filter(x => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update('rules', [...data.rules, { id: uid(), rule: '', enforcement: '' }])}><Plus className="w-4 h-4 mr-1" /> Add rule</Button>
            </div>
          </SectionCard>

          {/* 5 Office Issues */}
          <SectionCard n={5} title="Office Issues" subtitle="Issues at the office to address.">
            <Textarea rows={4} value={data.office_issues} onChange={(e) => update('office_issues', e.target.value)} placeholder="" />
          </SectionCard>

          {/* 6 Roles */}
          <SectionCard n={6} title="Roles for Next Week" subtitle="Assign every role. Host, DJ, Breakdown Lead, and training slots.">
            <div className="space-y-3">
              {data.roles.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Input className="font-semibold sm:max-w-[260px]" placeholder="Role name" value={r.role} disabled={r.locked} onChange={(e) => update('roles', data.roles.map(x => x.id === r.id ? { ...x, role: e.target.value } : x))} />
                    {!r.locked && <Button variant="ghost" size="icon" onClick={() => update('roles', data.roles.filter(x => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Assigned person</Label><Input value={r.assignee} onChange={(e) => update('roles', data.roles.map(x => x.id === r.id ? { ...x, assignee: e.target.value } : x))} placeholder="Name" /></div>
                    <div><Label>Show-up time</Label><Input value={r.show_time} onChange={(e) => update('roles', data.roles.map(x => x.id === r.id ? { ...x, show_time: e.target.value } : x))} placeholder="e.g. 7:30am" /></div>
                  </div>
                  <div><Label>Expectations</Label><Textarea rows={2} value={r.expectations} onChange={(e) => update('roles', data.roles.map(x => x.id === r.id ? { ...x, expectations: e.target.value } : x))} /></div>
                  <div><Label>How we improve this role vs. last week</Label><Textarea rows={2} value={r.improvement} onChange={(e) => update('roles', data.roles.map(x => x.id === r.id ? { ...x, improvement: e.target.value } : x))} /></div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update('roles', [...data.roles, { id: uid(), role: '', assignee: '', show_time: '', expectations: '', improvement: '' }])}><Plus className="w-4 h-4 mr-1" /> Add role / training slot</Button>
            </div>
          </SectionCard>

          {/* 7 Managers */}
          <SectionCard n={7} title="Manager Compliment + Critique" subtitle="One compliment and one area to improve per manager.">
            <div className="space-y-3">
              {data.managers.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Input className="font-semibold sm:max-w-[260px]" placeholder="Manager name" value={m.name} onChange={(e) => update('managers', data.managers.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))} />
                    <Button variant="ghost" size="icon" onClick={() => update('managers', data.managers.filter(x => x.id !== m.id))}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Compliment</Label><Textarea rows={2} value={m.compliment} onChange={(e) => update('managers', data.managers.map(x => x.id === m.id ? { ...x, compliment: e.target.value } : x))} /></div>
                    <div><Label>Critique / Work on</Label><Textarea rows={2} value={m.critique} onChange={(e) => update('managers', data.managers.map(x => x.id === m.id ? { ...x, critique: e.target.value } : x))} /></div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update('managers', [...data.managers, { id: uid(), name: '', compliment: '', critique: '' }])}><Plus className="w-4 h-4 mr-1" /> Add manager</Button>
            </div>
          </SectionCard>

          {/* 8 Weekend */}
          <SectionCard n={8} title="Weekend Activity Assignment" subtitle="Who plans next weekend's activity, and the plan.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Planner (who owns it)</Label><Input value={data.weekend_planner} onChange={(e) => update('weekend_planner', e.target.value)} placeholder="Name" /></div>
              <div><Label>Activity idea</Label><Input value={data.weekend_idea} onChange={(e) => update('weekend_idea', e.target.value)} placeholder="Activity" /></div>
            </div>
          </SectionCard>

          {/* 9 Car groups */}
          <SectionCard n={9} title="Area Map + Car Groups" subtitle="Driver, riders, and assigned area per group.">
            <div className="space-y-3">
              {data.car_groups.map((g) => (
                <div key={g.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col sm:flex-row gap-3">
                  <Input className="sm:max-w-[200px]" placeholder="Driver" value={g.group_name} onChange={(e) => update('car_groups', data.car_groups.map(x => x.id === g.id ? { ...x, group_name: e.target.value } : x))} />
                  <Input className="flex-1" placeholder="Riders" value={g.riders} onChange={(e) => update('car_groups', data.car_groups.map(x => x.id === g.id ? { ...x, riders: e.target.value } : x))} />
                  <Input className="sm:max-w-[220px]" placeholder="Area" value={g.area} onChange={(e) => update('car_groups', data.car_groups.map(x => x.id === g.id ? { ...x, area: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => update('car_groups', data.car_groups.filter(x => x.id !== g.id))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update('car_groups', [...data.car_groups, { id: uid(), group_name: '', riders: '', area: '' }])}><Plus className="w-4 h-4 mr-1" /> Add car group</Button>
            </div>
          </SectionCard>

          {/* 10 Team goal */}
          <SectionCard n={10} title="Team Goal + Action Items Recap" subtitle="The week's goal and who owns what.">
            <div><Label>Team goal for the week</Label><Input value={data.team_goal} onChange={(e) => update('team_goal', e.target.value)} placeholder="Goal for the week" /></div>
            <div><Label>Action items recap</Label><Textarea rows={5} value={data.action_items} onChange={(e) => update('action_items', e.target.value)} placeholder="Owner — task — due" /></div>
          </SectionCard>
        </div>

        {/* Sticky save (mobile + desktop) */}
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.06] bg-background/85 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Week of {format(weekOf, 'MMM d, yyyy')}</span>
            <Button onClick={save} disabled={saving || loading} className="w-full sm:w-auto sm:min-w-[200px]">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : existingId ? 'Update Submission' : 'Submit Meeting'}
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
