import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CalendarClock, MapPin, Plus, Pencil, Check, X, ChevronDown, ClipboardCheck, Loader2, Trash2,
  List, CalendarDays,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { VerticalScopeSelect } from '@/components/shared/VerticalScopeSelect';
import { UpcomingBlitzes } from '@/components/fiber/UpcomingBlitzes';

const CalendarView = lazy(() => import('./CalendarPage'));

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

const KINDS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'training', label: 'Training' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'dinner', label: 'Team dinner' },
  { value: 'other', label: 'Other' },
];

const SCOPES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'team', label: 'A specific team' },
  { value: 'managers', label: 'Managers and above' },
];

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  event_kind: string;
  scope: string;
  team_id: string | null;
  team_name: string | null;
  created_by: string | null;
  is_series: boolean;
  my_rsvp: string | null;
  going_count: number;
  present_count: number;
}

interface CheckinRow {
  user_id: string;
  full_name: string | null;
  team_name: string | null;
  rsvp: string | null;
  present: boolean | null;
}

interface DraftEvent {
  vertical?: string | null;
  id?: string;
  title: string;
  event_kind: string;
  scope: string;
  team_id: string | null;
  local_datetime: string;
  location: string;
  description: string;
  weekly: boolean;
}

function kindLabel(kind: string) {
  return KINDS.find((k) => k.value === kind)?.label ?? 'Other';
}

/** Calendar day of a stored timestamp, read in UTC so the stored last day never shifts. */
function utcDayKey(iso: string) {
  return iso.slice(0, 10);
}

function fmtUtcDay(iso: string, withWeekday = false) {
  const [y, m, d] = utcDayKey(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    month: 'short',
    day: 'numeric',
  });
}

function fmtRange(start: string, end: string | null) {
  const base = fmtWhen(start);
  if (!end) return base;
  if (utcDayKey(end) === utcDayKey(start)) return base;
  return `${fmtUtcDay(start, true)} to ${fmtUtcDay(end)}`;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyDraft(): DraftEvent {
  return {
    title: '', event_kind: 'meeting', scope: 'everyone', team_id: null,
    local_datetime: toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    location: '', description: '', weekly: false,
  };
}

export default function EventsPage() {
  const { user, role } = useAuth();
  const { activeVertical, isPresidentOfActive } = useWorkspace();
  const canEditScope = role === 'owner' || role === 'admin' || role === 'president';
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const [rows, setRows] = useState<EventRow[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState<string | null>(null);
  const [checkinEvent, setCheckinEvent] = useState<EventRow | null>(null);
  const [checkinRows, setCheckinRows] = useState<CheckinRow[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ev: EventRow; series: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const canDelete = role === 'owner' || role === 'admin';

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any).rpc('delete_calendar_event', {
      p_event_id: deleteTarget.ev.id,
      p_series: deleteTarget.series,
    });
    setDeleting(false);
    if (error) {
      toast.error('Could not delete that event');
      return;
    }
    toast.success(deleteTarget.series ? 'Series deleted' : 'Event deleted');
    setDeleteTarget(null);
    load();
  };

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc('get_events_feed', {
      p_from: new Date(Date.now() - 60 * 86400000).toISOString(),
      p_to: new Date(Date.now() + 420 * 86400000).toISOString(),
    });
    if (error) toast.error('Could not load events');
    setRows((data as EventRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isManager) return;
    supabase.from('teams').select('id, name').order('name').then(({ data }) => {
      setTeams((data as { id: string; name: string }[]) || []);
    });
  }, [isManager]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: EventRow[] = [];
    const old: EventRow[] = [];
    for (const r of rows) {
      if (new Date(r.event_date).getTime() >= now - 60 * 60 * 1000) up.push(r);
      else old.push(r);
    }
    old.reverse();
    return { upcoming: up, past: old };
  }, [rows]);

  const rsvp = async (eventId: string, status: 'attending' | 'not_attending') => {
    setRsvpBusy(eventId);
    const { error } = await (supabase as any).rpc('rsvp_event', { p_event_id: eventId, p_status: status });
    setRsvpBusy(null);
    if (error) {
      toast.error('Could not save your RSVP');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === eventId
      ? {
          ...r,
          my_rsvp: status,
          going_count: r.going_count + (status === 'attending' ? (r.my_rsvp === 'attending' ? 0 : 1) : (r.my_rsvp === 'attending' ? -1 : 0)),
        }
      : r)));
  };

  const openCheckin = async (ev: EventRow) => {
    setCheckinEvent(ev);
    setCheckinLoading(true);
    const { data, error } = await (supabase as any).rpc('get_event_checkin', { p_event_id: ev.id });
    setCheckinLoading(false);
    if (error) {
      toast.error('Could not load the roster');
      return;
    }
    setCheckinRows((data as CheckinRow[]) || []);
  };

  const togglePresent = async (userId: string, next: boolean) => {
    if (!checkinEvent) return;
    const { error } = await (supabase as any).rpc('mark_event_present', {
      p_event_id: checkinEvent.id, p_user_id: userId, p_present: next,
    });
    if (error) {
      toast.error(error.message?.includes('closed') ? 'Attendance for this event is closed' : 'Could not save');
      return;
    }
    setCheckinRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, present: next } : r)));
  };

  const save = async () => {
    if (!draft?.title.trim() || !draft.local_datetime) {
      toast.error('Title and date are required');
      return;
    }
    if (draft.scope === 'team' && !draft.team_id) {
      toast.error('Pick a team for this event');
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      event_date: new Date(draft.local_datetime).toISOString(),
      location: draft.location.trim() || null,
      event_kind: draft.event_kind,
      scope: draft.scope,
      team_id: draft.scope === 'team' ? draft.team_id : null,
      recurrence_type: draft.weekly ? 'weekly' : null,
      vertical: draft.vertical === undefined ? activeVertical : draft.vertical,
    };
    const { error } = draft.id
      ? await supabase.from('calendar_events').update(payload).eq('id', draft.id)
      : await supabase.from('calendar_events').insert({ ...payload, created_by: user?.id ?? null });

    if (error) {
      setSaving(false);
      toast.error('Save failed');
      return;
    }
    if (draft.weekly) {
      await (supabase as any).rpc('expand_event_series', { p_weeks: 8 });
    }
    setSaving(false);
    toast.success(draft.id ? 'Event updated' : 'Event created');
    setDraft(null);
    load();
  };

  const EventCard = ({ ev, isPast }: { ev: EventRow; isPast: boolean }) => {
    const frozen = Date.now() > new Date(ev.event_date).getTime() + 24 * 60 * 60 * 1000;
    return (
      <div id={`event-${ev.id}`} className={cn(CARD, 'scroll-mt-24 px-4 py-3.5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground">{ev.title}</p>
            <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
              {fmtRange(ev.event_date, ev.end_date)} · {kindLabel(ev.event_kind)}
              {ev.scope === 'team' && ev.team_name ? ` · ${ev.team_name}` : ''}
              {ev.scope === 'managers' ? ' · Managers and above' : ''}
              {ev.is_series ? ' · Weekly' : ''}
            </p>
            {ev.location && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {ev.location}
              </p>
            )}
            {ev.description && (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                {ev.description}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-lg border border-border/60 bg-surface px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
            {isPast ? `${ev.present_count} present` : `${ev.going_count} going`}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isPast && (
            <>
              <button
                onClick={() => rsvp(ev.id, 'attending')}
                disabled={rsvpBusy === ev.id}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors',
                  ev.my_rsvp === 'attending'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/60 bg-surface text-muted-foreground hover:text-foreground'
                )}
              >
                <Check className="h-3.5 w-3.5" /> Going
              </button>
              <button
                onClick={() => rsvp(ev.id, 'not_attending')}
                disabled={rsvpBusy === ev.id}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors',
                  ev.my_rsvp === 'not_attending'
                    ? 'bg-muted text-foreground'
                    : 'border border-border/60 bg-surface text-muted-foreground hover:text-foreground'
                )}
              >
                <X className="h-3.5 w-3.5" /> Can't make it
              </button>
            </>
          )}

          {isManager && (
            <>
              <button
                onClick={() => openCheckin(ev)}
                disabled={frozen}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <ClipboardCheck className="h-3.5 w-3.5" /> {frozen ? 'Attendance closed' : 'Check in'}
              </button>
              <button
                onClick={() => setDraft({
                  id: ev.id,
                  title: ev.title,
                  event_kind: ev.event_kind,
                  scope: ev.scope,
                  team_id: ev.team_id,
                  local_datetime: toLocalInput(ev.event_date),
                  location: ev.location ?? '',
                  description: ev.description ?? '',
                  weekly: false,
                })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </>
          )}

          {canDelete && (
            <>
              <button
                onClick={() => setDeleteTarget({ ev, series: false })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-destructive/40 bg-surface px-2.5 text-[12px] font-medium text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              {ev.is_series && (
                <button
                  onClick={() => setDeleteTarget({ ev, series: true })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-destructive/40 bg-surface px-2.5 text-[12px] font-medium text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete series
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader
          title="Events"
          context="Trips, blitzes, meetings and training. Say yes or no right on the card."
          action={
            isManager ? (
              <button
                onClick={() => setDraft(emptyDraft())}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> New event
              </button>
            ) : undefined
          }
          className="mb-2 border-none pb-0"
        />
        {activeVertical === 'Fiber' && <UpcomingBlitzes />}

        <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-border/60 bg-surface p-1">
          {([['list', 'List', List], ['calendar', 'Calendar', CalendarDays]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors',
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {view === 'calendar' ? (
          <Suspense fallback={<Skeleton className="h-64 rounded-[var(--radius)]" />}>
            <CalendarView embedded />
          </Suspense>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />
            ))}
          </div>
        ) : (
          <div className="space-y-7">
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Upcoming</h2>
                <span className="text-[12px] tabular-nums text-muted-foreground">{upcoming.length}</span>
              </div>
              {upcoming.length === 0 ? (
                <div className={cn(CARD, 'px-4 py-5 text-center text-[13px] text-muted-foreground')}>
                  Nothing scheduled yet
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} isPast={false} />)}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="mb-2.5 flex w-full items-center gap-2 text-left"
                >
                  <h2 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Past</h2>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{past.length}</span>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showPast && 'rotate-180')} />
                </button>
                {showPast && (
                  <div className="space-y-2.5">
                    {past.map((ev) => <EventCard key={ev.id} ev={ev} isPast />)}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Create / edit */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Edit event' : 'New event'}</DialogTitle>
            <DialogDescription>Only people in scope will see this event.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-3">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Title"
              />
              <Select value={draft.event_kind} onValueChange={(v) => setDraft({ ...draft, event_kind: v })}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                value={draft.local_datetime}
                onChange={(e) => setDraft({ ...draft, local_datetime: e.target.value })}
              />
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Location"
              />
              <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v })}>
                <SelectTrigger><SelectValue placeholder="Who can see it" /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {draft.scope === 'team' && (
                <Select value={draft.team_id ?? ''} onValueChange={(v) => setDraft({ ...draft, team_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {canEditScope && (
                <VerticalScopeSelect
                  value={draft.vertical === undefined ? activeVertical : draft.vertical}
                  onChange={(v) => setDraft({ ...draft, vertical: v })}
                  lockedTo={isPresidentOfActive && role === 'president' ? activeVertical : null}
                />
              )}
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Description (optional)"
                rows={3}
              />
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface px-3 py-2.5">
                <span className="text-[13px] text-foreground">Repeat weekly</span>
                <Switch
                  checked={draft.weekly}
                  onCheckedChange={(v) => setDraft({ ...draft, weekly: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in */}
      <Dialog open={!!checkinEvent} onOpenChange={(o) => !o && setCheckinEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check in</DialogTitle>
            <DialogDescription>{checkinEvent?.title}</DialogDescription>
          </DialogHeader>

          {checkinLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {checkinRows.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-muted-foreground">No one is in scope for this event.</p>
              ) : checkinRows.map((r) => (
                <button
                  key={r.user_id}
                  onClick={() => togglePresent(r.user_id, !r.present)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left',
                    r.present ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-surface'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{r.full_name ?? 'Unnamed'}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {r.team_name ?? 'No team'} · {r.rsvp === 'attending' ? 'Going' : r.rsvp === 'not_attending' ? "Can't make it" : 'No RSVP'}
                    </span>
                  </span>
                  <span className={cn('text-[12px] font-semibold', r.present ? 'text-primary' : 'text-muted-foreground')}>
                    {r.present ? 'Present' : 'Mark present'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{deleteTarget?.series ? 'Delete this series?' : 'Delete this event?'}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.ev.title}
              {deleteTarget?.series
                ? '. Every date in the series goes, along with its RSVPs and attendance. This cannot be undone.'
                : '. Its RSVPs and attendance go with it. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/60 bg-surface px-4 text-[13px] font-medium text-muted-foreground"
            >
              Keep it
            </button>
            <button
              onClick={runDelete}
              disabled={deleting}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
