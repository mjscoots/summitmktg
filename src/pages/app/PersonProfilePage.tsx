import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SelfReportedSales } from '@/components/sales/SelfReportedSales';
import { MasteryChecksCard } from '@/components/training/MasteryChecksCard';
import { AllMoneyCard } from '@/components/money/AllMoneyCard';
import { NewRepDayOneCard } from '@/components/team/NewRepDayOneCard';
import { ChevronLeft, ChevronDown, Phone, Mail, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleChip } from '@/components/shared/RoleChip';


interface PersonProfile {
  scope: 'self' | 'manager' | 'staff';
  header: Record<string, any> | null;
  workspaces: { vertical: string; status: string; activated_at: string | null }[];
  engagement: Record<string, any>;
  activity_days: { day: string; minutes: number; sessions: number }[];
  forms: { form: string; at: string; answers: Record<string, any> | null }[];
  production: {
    revenue_months: { month: string; revenue: number }[];
    installs_weeks: { week_start: string; installs: number; cancels: number }[];
  };
  lead: Record<string, any> | null;
  season_history: Record<string, any> | null;
}

function fmtDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusWord(header: Record<string, any> | null, lead: Record<string, any> | null) {
  if (!header) return '—';
  if (header.archived) return 'Departed';
  const s = String(header.status || '').toLowerCase();
  if (s === 'nlc') return 'Locked out';
  if (s === 'pending' || s === 'applied') return 'Applied';
  if (s === 'active' || s === 'onboarded' || s === 'contract_signed' || s === 'info_added') return 'Active';
  if (lead) return 'Lead';
  return s ? s.replace(/_/g, ' ') : '—';
}

function answerWord(status?: string | null) {
  const s = String(status || 'no_answer').toLowerCase();
  if (s === 'going' || s === 'yes' || s === 'attending') return 'Going';
  if (s === 'not_attending' || s === 'not_going' || s === 'no' || s === 'cant' || s === 'declined') return "Can't";
  if (s === 'maybe') return 'Maybe';

  return 'No answer';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] tabular-nums text-foreground text-right">{value}</span>
    </div>
  );
}

export default function PersonProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [seasonOpen, setSeasonOpen] = useState(false);

  const [data, setData] = useState<PersonProfile | null>(null);
  const [timeSplit, setTimeSplit] = useState<any | null>(null);
  const [recap, setRecap] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [openThread, setOpenThread] = useState<{ id: string; messages: any[] } | null>(null);
  const [aiProfile, setAiProfile] = useState<any | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setIsLoading(true);
    (async () => {
      const { data: res, error: err } = await supabase.rpc('get_person_profile' as never, {
        _user_id: userId,
      } as never);
      if (!alive) return;
      if (err) setError(err);
      else setData(res as unknown as PersonProfile);
      setIsLoading(false);

      const [split, rec, ev, th, ai] = await Promise.all([
        supabase.rpc('get_person_time_split' as never, { _user_id: userId } as never),
        supabase.rpc('get_training_recap' as never, { _user_id: userId } as never),
        supabase.rpc('get_person_event_answers' as never, { _user_id: userId, _limit: 10 } as never),
        supabase.rpc('get_person_threads' as never, { _user_id: userId } as never),
        (supabase as any).from('rep_ai_profiles').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      if (!alive) return;
      const s = split.data as any;
      if (s && !s.error) setTimeSplit(s);
      const r = rec.data as any;
      if (r && !r.error) setRecap(r);
      const e = ev.data as any;
      if (e && !e.error) setEvents((e.events || []) as any[]);
      const t = th.data as any;
      if (t && !t.error) setThreads((t.threads || []) as any[]);
      if (ai.data) setAiProfile(ai.data);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const screenRows = useMemo(() => {
    const screens = (timeSplit?.screens_7d || {}) as Record<string, number>;
    return Object.entries(screens)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [timeSplit]);


  const timeline = useMemo(() => {
    if (!data) return [];
    const items: { at: string; label: string; detail?: string }[] = [];
    (data.forms || []).forEach((f) => items.push({ at: f.at, label: f.form }));
    (data.lead?.activities || []).forEach((a: any) =>
      items.push({ at: a.at, label: a.kind || 'Call', detail: a.outcome || a.body })
    );
    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 40);
  }, [data]);

  const loadThread = async (id: string) => {
    const { data } = await (supabase as any).rpc('get_thread_messages', { _thread_id: id });
    setOpenThread({ id, messages: (data?.messages || []) as any[] });
  };

  const rebuildProfile = async () => {
    if (!userId) return;
    setRebuilding(true);
    try {
      await supabase.functions.invoke('build-rep-profile', { body: { user_id: userId } });
      const { data } = await (supabase as any)
        .from('rep_ai_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setAiProfile(data);
    } finally {
      setRebuilding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <Skeleton className="h-20 w-full rounded-[var(--radius)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius)]" />
      </div>
    );
  }

  if (error || !data?.header) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">You do not have access to this profile.</p>
        <Button variant="outline" className="mt-3 min-h-11" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const h = data.header;
  const e = data.engagement || {};
  const staff = data.scope === 'staff';
  const trackingStarted = e.tracking_started as string | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-3 pb-10">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          {h.avatar_url ? (
            <img src={h.avatar_url} alt={h.full_name || 'Profile photo'} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-[15px] font-semibold">
              {(h.full_name || '?').slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{h.full_name || 'Unnamed'}</h1>
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span>{statusWord(h, data.lead)}</span>
              {userId && <RoleChip userId={userId} />}
            </p>
          </div>
        </div>

        {staff && userId && (
          <StaffProfileEdit
            userId={userId}
            initial={{ full_name: h.full_name || '', phone: h.phone || '', email: h.email || '' }}
            onSaved={(patch) => setData((d) => (d ? { ...d, header: { ...d.header, ...patch } } : d))}
          />
        )}


        <div className="mt-3">
          <Row label="Manager" value={h.manager} />
          <Row label="Team" value={h.team} />
          <Row label="Office" value={h.office} />
          <Row label="Rank" value={h.rank_label} />
          <Row
            label="Workspaces"
            value={
              (data.workspaces || []).length
                ? data.workspaces.map((w) => `${w.vertical} (${w.status})`).join(', ')
                : null
            }
          />
          {h.phone && (
            <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2">
              <span className="text-[13px] text-muted-foreground">Phone</span>
              <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 text-[13px] text-primary">
                <Phone className="h-3.5 w-3.5" /> {h.phone}
              </a>
            </div>
          )}
          {h.email && (
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-[13px] text-muted-foreground">Email</span>
              <a href={`mailto:${h.email}`} className="inline-flex items-center gap-1 truncate text-[13px] text-primary">
                <Mail className="h-3.5 w-3.5" /> {h.email}
              </a>
            </div>
          )}
        </div>
      </Card>

      {data.scope !== 'self' && userId && <NewRepDayOneCard userId={userId} />}

      {/* What they've told us */}
      {(data.forms || []).length > 0 && (
        <Section title="What they've told us">
          <div className="space-y-2">
            {data.forms.map((f, i) => (
              <Card key={`${f.form}-${i}`} className="p-3">
                <p className="text-[13px] font-medium">
                  {f.form}
                  <span className="text-muted-foreground"> · {fmtDate(f.at)}</span>
                </p>
                <div className="mt-1 space-y-1">
                  {Object.entries(f.answers || {})
                    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                    .map(([k, v]) => (
                      <p key={k} className="text-[13px] text-muted-foreground">
                        <span className="text-foreground">{k}:</span> {String(v)}
                      </p>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Engagement */}
      <Section title="Engagement">
        <Card className="p-4">
          {!trackingStarted && (
            <p className="mb-2 text-[13px] text-muted-foreground">
              Tracking started {fmtDate(new Date().toISOString())} — no day-by-day data yet.
            </p>
          )}
          <Row label="Last login" value={fmtDateTime(e.last_login_at) || 'Not recorded yet'} />
          <Row label="Last active" value={fmtDateTime(e.last_active_at)} />
          {timeSplit && (
            <>
              <Row label="In the app (7 days)" value={`${timeSplit.app_7d ?? 0} min`} />
              <Row label="Training (7 days)" value={`${timeSplit.training_7d ?? 0} min`} />
              <Row label="In the app (30 days)" value={`${timeSplit.app_30d ?? 0} min`} />
              <Row label="Training (30 days)" value={`${timeSplit.training_30d ?? 0} min`} />
            </>
          )}
          <Row label="Time today" value={`${e.minutes_today ?? 0} min`} />
          <Row label="Daily average (14 days)" value={`${e.avg_minutes_14d ?? 0} min`} />
          <Row label="Days active (30 days)" value={e.days_active_30d ?? 0} />
          <Row label="Streak" value={e.streak ?? 0} />
          <Row label="Training" value={`${e.lessons_done ?? 0} of ${e.lessons_total ?? 0} lessons`} />
          <Row label="Last lesson" value={e.last_lesson} />
          <Row label="Chat messages (30 days)" value={e.chat_messages_30d ?? 0} />
          <Row label="Events attended" value={e.events_attended ?? 0} />
          {trackingStarted && <Row label="Tracking started" value={fmtDate(trackingStarted)} />}
        </Card>
      </Section>

      {/* Mastery checks — a manager can mark a chapter they watched in person */}
      {userId && (
        <Section title="Mastery checks">
          <MasteryChecksCard userId={userId} />
        </Section>
      )}

      {/* Money across industries */}
      {userId && (
        <Section title="Money across industries">
          <AllMoneyCard userId={userId} />
        </Section>
      )}

      {/* Where the time went */}
      {screenRows.length > 0 && (
        <Section title="Where the time went (7 days)">
          <Card className="p-4">
            {screenRows.map(([label, minutes]) => (
              <Row key={label} label={label} value={`${minutes} min`} />
            ))}
          </Card>
        </Section>
      )}

      {/* What they trained on */}
      {recap && (
        <Section title="What they trained on">
          <Card className="p-4 space-y-3">
            {(['lessons', 'videos', 'drills', 'chapters'] as const).map((key) => {
              const items = (recap[key] || []) as { name: string; at: string }[];
              const label =
                key === 'lessons' ? 'Lessons' : key === 'videos' ? 'Videos' : key === 'drills' ? 'Drills' : 'Manual chapters';
              const last7 = items.filter((i) => new Date(i.at).getTime() >= Date.now() - 7 * 86400000);
              return (
                <div key={key}>
                  <p className="text-[13px] font-medium">
                    {label}
                    <span className="text-muted-foreground">
                      {' '}
                      · {last7.length} in 7 days · {items.length} in 30 days
                    </span>
                  </p>
                  {items.slice(0, 8).map((i, idx) => (
                    <p key={`${key}-${idx}`} className="text-[13px] text-muted-foreground">
                      {i.name} · {fmtDate(i.at)}
                    </p>
                  ))}
                  {items.length === 0 && <p className="text-[13px] text-muted-foreground">None recorded</p>}
                </div>
              );
            })}
          </Card>
        </Section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <Section title="Events">
          <Card className="p-4">
            {events.map((ev) => (
              <Row
                key={ev.event_id}
                label={`${ev.title} · ${fmtDate(ev.event_date)}`}
                value={`${answerWord(ev.answer)}${
                  ev.present === true ? ' · present' : ev.present === false ? ' · absent' : ''
                }`}
              />
            ))}
          </Card>
        </Section>
      )}


      {/* What Summit has learned */}
      {aiProfile && (
        <Section title="What Summit has learned">
          <Card className="p-4 space-y-2">
            {aiProfile.summary ? (
              <p className="text-[13px] text-foreground whitespace-pre-wrap">{aiProfile.summary}</p>
            ) : (
              <p className="text-[13px] text-muted-foreground">No profile built yet.</p>
            )}
            {(aiProfile.strengths || []).length > 0 && (
              <div>
                <p className="text-[13px] font-medium">Strengths</p>
                {(aiProfile.strengths as string[]).map((x, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground">{x}</p>
                ))}
              </div>
            )}
            {(aiProfile.concerns || []).length > 0 && (
              <div>
                <p className="text-[13px] font-medium">Where they seem stuck</p>
                {(aiProfile.concerns as string[]).map((x, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground">{x}</p>
                ))}
              </div>
            )}
            {(aiProfile.topics || []).length > 0 && (
              <Row label="Asks about most" value={(aiProfile.topics as string[]).join(', ')} />
            )}
            {aiProfile.goals && <Row label="Goals they stated" value={aiProfile.goals} />}
            <Row label="Built" value={fmtDateTime(aiProfile.last_built_at) || 'Not built yet'} />
            <Row label="Sources used" value={aiProfile.source_count ?? 0} />
          </Card>
        </Section>
      )}

      {staff && (
        <Button variant="outline" className="min-h-11" disabled={rebuilding} onClick={rebuildProfile}>
          {rebuilding ? 'Rebuilding' : aiProfile ? 'Rebuild profile' : 'Build profile'}
        </Button>
      )}

      {/* Ask Summit threads */}
      {threads.length > 0 && (
        <Section title="Ask Summit threads">
          <Card className="p-4 space-y-2">
            {threads.map((t) => (
              <div key={t.id}>
                <button
                  onClick={() => (openThread?.id === t.id ? setOpenThread(null) : loadThread(t.id))}
                  className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border/40 py-2 text-left"
                >
                  <span className="text-[13px] text-foreground">{t.title || 'Thread'}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {t.message_count} · {fmtDate(t.last_at)}
                  </span>
                </button>
                {openThread?.id === t.id && (
                  <div className="space-y-2 py-2">
                    {openThread.messages.map((m: any, i: number) => (
                      <p key={i} className="text-[13px] whitespace-pre-wrap">
                        <span className="text-muted-foreground">{m.role === 'user' ? 'They asked: ' : 'Summit: '}</span>
                        {m.content}
                      </p>
                    ))}
                    {openThread.messages.length === 0 && (
                      <p className="text-[13px] text-muted-foreground">No messages.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* Production */}
      {(data.production?.revenue_months?.length || data.production?.installs_weeks?.length) ? (
        <Section title="Production">
          <Card className="p-4">
            {(data.production.revenue_months || []).map((m) => (
              <Row key={m.month} label={fmtDate(m.month) || m.month} value={`$${Number(m.revenue || 0).toLocaleString()}`} />
            ))}
            {(data.production.installs_weeks || []).map((w) => (
              <Row
                key={w.week_start}
                label={`Week of ${fmtDate(w.week_start)}`}
                value={`${w.installs} installs${w.cancels ? ` · ${w.cancels} cancels` : ''}`}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {/* Leads and outreach */}
      {data.lead && (
        <Section title="Leads and outreach">
          <Card className="p-4">
            <Row label="Stage" value={data.lead.stage} />
            <Row label="Designation" value={data.lead.designation_status} />
            <Row label="Designated to" value={data.lead.designated_to} />
            <Row label="Next callback" value={fmtDateTime(data.lead.next_call_at)} />
            <Row label="Last contact" value={fmtDateTime(data.lead.last_contact_at)} />
            <Row label="Calls" value={data.lead.call_count} />
            {(data.lead.activities || []).length > 0 && (
              <div className="mt-3 space-y-1">
                {(data.lead.activities || []).slice(0, 10).map((a: any, i: number) => (
                  <p key={i} className="text-[13px] text-muted-foreground">
                    {fmtDate(a.at)} · {a.kind}
                    {a.outcome ? ` · ${a.outcome}` : ''}
                    {a.body ? ` — ${a.body}` : ''}
                  </p>
                ))}
              </div>
            )}
          </Card>
        </Section>
      )}

      {/* Private notes — staff only */}
      {staff && (data.lead?.private_notes || []).length > 0 && (
        <Section title="Private notes">
          <Card className="p-4 space-y-1">
            {(data.lead!.private_notes as any[]).map((n, i) => (
              <p key={i} className="text-[13px] text-muted-foreground">
                <span className="text-foreground">{n.kind}:</span> {n.body}
                <span className="text-muted-foreground"> · {fmtDate(n.at)}</span>
              </p>
            ))}
          </Card>
        </Section>
      )}

      {/* Season history — staff only, collapsed */}
      {staff && data.season_history && (
        <section>
          <button
            onClick={() => setSeasonOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between text-[13px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Season history
            <ChevronDown className={`h-4 w-4 transition-transform ${seasonOpen ? 'rotate-180' : ''}`} />
          </button>
          {seasonOpen && (
            <Card className="mt-2 p-4">
              <Row label="Showed up" value={fmtDate(data.season_history.showed_up_date)} />
              <Row label="Departure type" value={data.season_history.departure_type} />
              <Row label="Departure reason" value={data.season_history.departure_reason} />
              <Row label="Last day worked" value={fmtDate(data.season_history.last_day_worked)} />
              <Row label="Committed last day" value={fmtDate(data.season_history.committed_last_day)} />
              <Row label="Next-season status" value={data.season_history.next_year_status} />
              <Row label="Next-season notes" value={data.season_history.next_year_notes} />
              <Row label="Last sweep" value={fmtDate(data.season_history.last_sweep_at)} />
              <Row label="Rep year" value={data.season_history.rep_year} />
            </Card>
          )}
        </section>
      )}

      {/* Self-reported sales */}
      {userId && (
        <Section title="Sales (self-reported)">
          <SelfReportedSales userId={userId} canEdit={data.scope === 'manager' || staff} />
        </Section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <Section title="Timeline">
          <Card className="p-4">
            {timeline.map((t, i) => (
              <Row key={i} label={fmtDate(t.at) || ''} value={t.detail ? `${t.label} — ${t.detail}` : t.label} />
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}
