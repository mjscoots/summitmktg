import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, XCircle, Calendar as CalendarIcon, ChevronRight, ClipboardList, Eye } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CopyLinkButton } from '@/components/shared/CopyLinkButton';

interface SubRow {
  id: string;
  user_id: string;
  week_of: string;
  updated_at: string;
  data: any;
}
interface ManagerProfile { user_id: string; full_name: string | null; nickname: string | null; avatar_url: string | null; }

export default function ManagerMeetingHubContent() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  const [weekOf, setWeekOf] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [datePopOpen, setDatePopOpen] = useState(false);
  const [managers, setManagers] = useState<ManagerProfile[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [mySub, setMySub] = useState<SubRow | null>(null);
  const [viewing, setViewing] = useState<SubRow | null>(null);
  const [loading, setLoading] = useState(false);

  const weekKey = useMemo(() => format(weekOf, 'yyyy-MM-dd'), [weekOf]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // my submission status
      const { data: mine } = await supabase
        .from('manager_meeting_submissions')
        .select('id, user_id, week_of, updated_at, data')
        .eq('user_id', user.id)
        .eq('week_of', weekKey)
        .maybeSingle();
      if (!cancelled) setMySub((mine as any) || null);

      if (isAdmin) {
        // all manager-level users
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['manager', 'admin', 'owner']);
        const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url')
            .in('user_id', ids);
          if (!cancelled) setManagers((profs as any) || []);
        }
        const { data: allSubs } = await supabase
          .from('manager_meeting_submissions')
          .select('id, user_id, week_of, updated_at, data')
          .eq('week_of', weekKey);
        if (!cancelled) setSubs((allSubs as any) || []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, weekKey, isAdmin]);

  const subByUser = useMemo(() => {
    const map = new Map<string, SubRow>();
    subs.forEach(s => map.set(s.user_id, s));
    return map;
  }, [subs]);

  const submittedCount = subs.length;
  const totalManagers = managers.length;

  return (
    <div className="space-y-8">
      {/* CTA card */}
      <div
        onClick={() => navigate('/app/manager-meeting')}
        className="group relative rounded-2xl bg-card/60 backdrop-blur-sm border border-white/[0.06] hover:border-primary/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer p-6 flex items-center gap-5"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base">Weekly Manager Meeting</h3>
          <p className="text-sm text-muted-foreground mt-1">Recap last week, assign roles, and lock in the plan.</p>
          {mySub && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> You submitted for week of {format(weekOf, 'MMM d')}
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Admin overview */}
      {isAdmin && (
        <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-white/[0.06] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-white/[0.04] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-[15px]">Submissions Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{submittedCount} of {totalManagers} managers submitted</p>
            </div>
            <Popover open={datePopOpen} onOpenChange={setDatePopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-white/[0.02]">
                  <CalendarIcon className="w-4 h-4" />
                  Week of {format(weekOf, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                <Calendar
                  mode="single"
                  selected={weekOf}
                  onSelect={(d) => { if (d) { setWeekOf(startOfWeek(d, { weekStartsOn: 1 })); setDatePopOpen(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loading && <div className="px-6 py-8 text-sm text-muted-foreground">Loading…</div>}
            {!loading && managers.length === 0 && <div className="px-6 py-8 text-sm text-muted-foreground">No managers found.</div>}
            {!loading && managers.map(m => {
              const sub = subByUser.get(m.user_id);
              return (
                <div key={m.user_id} className="px-5 sm:px-6 py-3.5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden flex-shrink-0">
                    {m.avatar_url && <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.full_name || m.nickname || 'Unnamed'}</div>
                    {sub && <div className="text-xs text-muted-foreground">Updated {format(new Date(sub.updated_at), 'MMM d, h:mm a')}</div>}
                  </div>
                  {sub ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/25">
                      <XCircle className="w-3 h-3" /> Missing
                    </span>
                  )}
                  <Button variant="ghost" size="sm" disabled={!sub} onClick={() => sub && setViewing(sub)} className="gap-1.5">
                    <Eye className="w-4 h-4" /> View
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission — week of {viewing && format(new Date(viewing.week_of), 'MMM d, yyyy')}</DialogTitle>
          </DialogHeader>
          {viewing && <SubmissionView data={viewing.data} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="text-sm text-foreground whitespace-pre-wrap">{String(value)}</div>
    </div>
  );
}

function SubmissionView({ data }: { data: any }) {
  const d = data || {};
  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <h4 className="font-semibold">1. Last Week's Accountability</h4>
        <Field label="Recap" value={d.last_week_accountability} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Goal" value={d.last_week_goal} />
          <Field label="Actual" value={d.last_week_actual} />
          <Field label="% to goal" value={d.last_week_pct} />
        </div>
      </section>
      <section><h4 className="font-semibold mb-2">2. Wins</h4><Field label="" value={d.wins} /></section>
      {d.reps?.length > 0 && (
        <section><h4 className="font-semibold mb-2">3. Rep Triage</h4>
          <ul className="space-y-1.5">{d.reps.map((r: any) => <li key={r.id} className={cn('text-sm rounded-md px-3 py-2 border', r.status === 'cut' && 'border-red-500/30 bg-red-500/5', r.status === 'watch' && 'border-amber-500/30 bg-amber-500/5', r.status === 'help' && 'border-blue-500/30 bg-blue-500/5', r.status === 'promote' && 'border-emerald-500/30 bg-emerald-500/5')}><b>{r.name}</b> — <span className="uppercase text-xs">{r.status}</span>{r.note && <> · {r.note}</>}</li>)}</ul>
        </section>
      )}
      {d.rules?.length > 0 && (
        <section><h4 className="font-semibold mb-2">4. Constitutional Rules</h4>
          <ul className="space-y-1.5">{d.rules.map((r: any) => <li key={r.id} className="text-sm"><b>{r.rule}</b>{r.enforcement && <> — {r.enforcement}</>}</li>)}</ul>
        </section>
      )}
      <section><h4 className="font-semibold mb-2">5. Office Issues</h4><Field label="" value={d.office_issues} /></section>
      {d.roles?.length > 0 && (
        <section><h4 className="font-semibold mb-2">6. Roles for Next Week</h4>
          <div className="space-y-2">{d.roles.map((r: any) => <div key={r.id} className="rounded-lg border border-white/[0.06] p-3"><div className="font-semibold">{r.role} — {r.assignee || '—'}{r.show_time && <span className="text-muted-foreground font-normal"> @ {r.show_time}</span>}</div>{r.expectations && <div className="text-muted-foreground mt-1">Expect: {r.expectations}</div>}{r.improvement && <div className="text-muted-foreground mt-1">Improve: {r.improvement}</div>}</div>)}</div>
        </section>
      )}
      {d.managers?.length > 0 && (
        <section><h4 className="font-semibold mb-2">7. Manager Compliment + Critique</h4>
          <div className="space-y-2">{d.managers.map((m: any) => <div key={m.id} className="rounded-lg border border-white/[0.06] p-3"><div className="font-semibold">{m.name}</div>{m.compliment && <div className="text-emerald-300 mt-1">+ {m.compliment}</div>}{m.critique && <div className="text-amber-300 mt-1">△ {m.critique}</div>}</div>)}</div>
        </section>
      )}
      <section><h4 className="font-semibold mb-2">8. Weekend Activity</h4>
        <div className="grid grid-cols-2 gap-3"><Field label="Planner" value={d.weekend_planner} /><Field label="Idea" value={d.weekend_idea} /></div>
      </section>
      {d.car_groups?.length > 0 && (
        <section><h4 className="font-semibold mb-2">9. Car Groups</h4>
          <ul className="space-y-1.5">{d.car_groups.map((g: any) => <li key={g.id} className="text-sm"><b>{g.group_name}</b> · {g.riders} · <span className="text-muted-foreground">{g.area}</span></li>)}</ul>
        </section>
      )}
      <section><h4 className="font-semibold mb-2">10. Team Goal + Action Items</h4>
        <Field label="Team goal" value={d.team_goal} />
        <Field label="Action items" value={d.action_items} />
      </section>
    </div>
  );
}
