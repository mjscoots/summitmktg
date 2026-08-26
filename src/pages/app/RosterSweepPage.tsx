import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2, Mic, MicOff, SkipForward, Undo2, Check, UserMinus, ClipboardCheck,
} from 'lucide-react';

const CARD = 'rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

const DEPARTURE_CHOICES = [
  { key: 'fired', label: 'Fired' },
  { key: 'quit', label: 'Quit' },
  { key: 'unknown', label: 'Unknown' },
] as const;

const NEXT_SEASON = ['Signed', 'Verbal', 'Undecided', 'Not returning', 'No answer'] as const;

const GAP_LABELS: Record<string, string> = {
  last_day: 'People with no committed last day',
  reason: 'Departed people with no reason',
  status: 'People with no next-season status',
  any: 'Only people with gaps',
};

interface Person {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  office: string | null;
  office_id: string | null;
  rank: string | null;
  rep_year: string | null;
  manager: string | null;
  recruiter: string | null;
  archived: boolean;
  departure_type: string | null;
  departure_reason: string | null;
  last_day_worked: string | null;
  committed_last_day: string | null;
  next_year_status: string | null;
  showed_up_date: string | null;
  last_sweep_at: string | null;
  resolved: boolean;
  latest_revenue_month: string | null;
  latest_revenue: number | null;
}

interface Office { id: string; name: string }

interface Queue {
  total: number;
  resolved: number;
  people: Person[];
  offices: Office[];
  error?: string;
}

function useSpeech(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const supported = typeof window !== 'undefined'
    && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0]?.transcript ?? '').join(' ').trim();
      if (text) onText(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  }, [listening, onText, supported]);

  return { supported, listening, toggle };
}

export default function RosterSweepPage() {
  const { user, role } = useAuth();
  const [params, setParams] = useSearchParams();
  const gap = params.get('gap');
  const officeParam = params.get('office');

  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'choose' | 'gone' | 'here'>('choose');
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ prev: any; name: string } | null>(null);

  // Gone inputs
  const [departureType, setDepartureType] = useState<string>('unknown');
  const [reason, setReason] = useState('');
  const [lastSale, setLastSale] = useState('');

  // Still-here inputs
  const [committedLastDay, setCommittedLastDay] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('');
  const [officeId, setOfficeId] = useState<string>('');
  const [showedUp, setShowedUp] = useState('');

  const cursorKey = user ? `roster_sweep_cursor_${user.id}_${gap ?? 'all'}_${officeParam ?? 'all'}` : null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('get_sweep_queue', {
      _office_id: officeParam || null,
      _leader: null,
      _gap: gap || null,
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Could not load the roster sweep');
      setLoading(false);
      return;
    }
    setQueue(data as Queue);
    setLoading(false);
  }, [gap, officeParam]);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Resume where the sweep left off
  useEffect(() => {
    if (!queue || !cursorKey) return;
    const saved = Number(window.localStorage.getItem(cursorKey) || '0');
    setIndex(Number.isFinite(saved) && saved > 0 && saved < queue.people.length ? saved : 0);
  }, [queue, cursorKey]);

  useEffect(() => {
    if (cursorKey) window.localStorage.setItem(cursorKey, String(index));
  }, [index, cursorKey]);

  const person = queue?.people[index] ?? null;

  // Prefill from the person's existing values so re-sweeping updates, never duplicates
  useEffect(() => {
    if (!person) return;
    setMode('choose');
    setDepartureType(person.departure_type && person.departure_type !== 'home_early' ? person.departure_type : 'unknown');
    setReason(person.departure_reason || '');
    setLastSale(person.last_day_worked || '');
    setCommittedLastDay(person.committed_last_day || '');
    setNextStatus(person.next_year_status || '');
    setOfficeId(person.office_id || '');
    setShowedUp(person.showed_up_date || '');
  }, [person]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const { data } = await (supabase as any).rpc('start_sweep_session', {
      _filter: { gap: gap || null, office: officeParam || null },
    });
    const id = data?.session_id ?? null;
    setSessionId(id);
    return id;
  }, [sessionId, gap, officeParam]);

  const advance = () => setIndex((i) => Math.min(i + 1, (queue?.people.length ?? 1) - 1));

  const applyLocal = (patch: Partial<Person>) => {
    setQueue((q) => {
      if (!q) return q;
      const people = q.people.map((p, i) => (i === index ? { ...p, ...patch, resolved: true } : p));
      return { ...q, people, resolved: q.people[index]?.resolved ? q.resolved : q.resolved + 1 };
    });
  };

  const saveGone = async () => {
    if (!person) return;
    setSaving(true);
    const sid = await ensureSession();
    const { data, error } = await (supabase as any).rpc('sweep_mark_gone', {
      _user_id: person.user_id,
      _departure_type: departureType,
      _reason: reason.trim() || null,
      _last_sale_date: lastSale || null,
      _session_id: sid,
    });
    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that');
      return;
    }
    setLastAction({ prev: data.prev, name: person.full_name || 'that person' });
    applyLocal({
      archived: true,
      departure_type: departureType,
      departure_reason: reason.trim() || person.departure_reason,
      last_day_worked: lastSale || person.last_day_worked,
    });
    toast.success('Recorded as gone');
    advance();
  };

  const saveHere = async () => {
    if (!person) return;
    setSaving(true);
    const sid = await ensureSession();
    const { data, error } = await (supabase as any).rpc('sweep_mark_here', {
      _user_id: person.user_id,
      _committed_last_day: committedLastDay || null,
      _next_year_status: nextStatus || null,
      _office_id: officeId || null,
      _showed_up_date: showedUp || null,
      _session_id: sid,
    });
    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that');
      return;
    }
    setLastAction({ prev: data.prev, name: person.full_name || 'that person' });
    applyLocal({
      archived: false,
      committed_last_day: committedLastDay || person.committed_last_day,
      next_year_status: nextStatus || person.next_year_status,
      office_id: officeId || person.office_id,
      showed_up_date: showedUp || person.showed_up_date,
    });
    toast.success('Marked still here');
    advance();
  };

  const undo = async () => {
    if (!lastAction) return;
    const { data, error } = await (supabase as any).rpc('sweep_restore', { _prev: lastAction.prev });
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not undo that');
      return;
    }
    toast.success(`Undid the last change for ${lastAction.name}`);
    setLastAction(null);
    setIndex((i) => Math.max(0, i - 1));
    load();
  };

  const speech = useSpeech((t) => setReason((r) => (r ? `${r} ${t}` : t)));

  const officeName = useMemo(
    () => queue?.offices.find((o) => o.id === officeId)?.name ?? null,
    [queue, officeId]
  );

  const canSweep = role === 'manager' || role === 'admin' || role === 'owner';

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <PageBackButton />

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/25">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Roster Sweep</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              One person at a time. Still here or gone, then the detail.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className={cn(CARD, 'mb-4 p-4')}>
          <p className="micro-label mb-2">Who you are sweeping</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { const p = new URLSearchParams(params); p.delete('gap'); setParams(p); }}
              className={cn(
                'min-h-11 rounded-lg border px-3 text-[13px] font-semibold',
                !gap ? 'border-primary/40 bg-primary text-primary-foreground' : 'border-border/60 bg-surface text-muted-foreground'
              )}
            >
              Everyone
            </button>
            {(['any', 'last_day', 'reason', 'status'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => { const p = new URLSearchParams(params); p.set('gap', g); setParams(p); }}
                className={cn(
                  'min-h-11 rounded-lg border px-3 text-[13px] font-semibold',
                  gap === g ? 'border-primary/40 bg-primary text-primary-foreground' : 'border-border/60 bg-surface text-muted-foreground'
                )}
              >
                {GAP_LABELS[g]}
              </button>
            ))}
          </div>
          {queue && queue.offices.length > 0 && (
            <div className="mt-3">
              <label className="micro-label mb-1.5 block" htmlFor="sweep-office-filter">Office</label>
              <select
                id="sweep-office-filter"
                value={officeParam || ''}
                onChange={(e) => {
                  const p = new URLSearchParams(params);
                  if (e.target.value) p.set('office', e.target.value); else p.delete('office');
                  setParams(p);
                }}
                className="h-11 w-full rounded-lg border border-white/[0.08] bg-background/50 px-3 text-[14px] text-foreground"
              >
                <option value="">All offices</option>
                {queue.offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!canSweep ? (
          <div className={cn(CARD, 'p-6 text-center text-[13px] text-muted-foreground')}>
            Managers and admins only.
          </div>
        ) : loading ? (
          <div className={cn(CARD, 'p-8 text-center')}>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !queue || queue.people.length === 0 ? (
          <div className={cn(CARD, 'p-6 text-center text-[13px] text-muted-foreground')}>
            Nobody to sweep with these filters.
          </div>
        ) : person ? (
          <>
            {/* Progress */}
            <div className="mb-3 flex items-center justify-between text-[13px] text-muted-foreground">
              <span className="tabular-nums">{index + 1} of {queue.people.length}</span>
              <span className="tabular-nums">{queue.resolved} resolved</span>
            </div>

            {/* Person card */}
            <div className={cn(CARD, 'p-5')}>
              <div className="flex items-center gap-3">
                <UserAvatar fullName={person.full_name || ''} avatarUrl={person.avatar_url} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold text-foreground">{person.full_name || '—'}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {[person.office, person.rank, person.rep_year].filter(Boolean).join(' · ') || 'No office on file'}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <dt className="micro-label">Manager</dt>
                  <dd className="text-foreground">{person.manager || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="micro-label">Recruiter</dt>
                  <dd className="text-foreground">{person.recruiter || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="micro-label">Latest revenue month</dt>
                  <dd className="tabular-nums text-foreground">
                    {person.latest_revenue_month
                      ? `${person.latest_revenue_month}${person.latest_revenue != null ? ` · $${Number(person.latest_revenue).toLocaleString()}` : ''}`
                      : 'No data yet'}
                  </dd>
                </div>
                <div>
                  <dt className="micro-label">On the roster as</dt>
                  <dd className="text-foreground">{person.archived ? 'Departed' : 'Active'}</dd>
                </div>
              </dl>

              {mode === 'choose' && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => setMode('here')}
                    className="min-h-14 rounded-xl text-[15px] font-bold"
                  >
                    <Check className="mr-2 h-5 w-5" /> Still here
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMode('gone')}
                    className="min-h-14 rounded-xl text-[15px] font-bold"
                  >
                    <UserMinus className="mr-2 h-5 w-5" /> Gone
                  </Button>
                </div>
              )}

              {mode === 'gone' && (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="micro-label mb-1.5">Fired, quit, or unknown</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DEPARTURE_CHOICES.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setDepartureType(d.key)}
                          className={cn(
                            'min-h-12 rounded-lg border text-[14px] font-semibold',
                            departureType === d.key
                              ? 'border-primary/40 bg-primary text-primary-foreground'
                              : 'border-border/60 bg-surface text-muted-foreground'
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="micro-label mb-1.5 block" htmlFor="sweep-reason">Reason, one line</label>
                    <div className="flex gap-2">
                      <Input
                        id="sweep-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={200}
                        placeholder="Their words, short"
                        className="min-h-12"
                      />
                      {speech.supported && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={speech.toggle}
                          aria-label={speech.listening ? 'Stop dictation' : 'Dictate the reason'}
                          className="min-h-12 w-12 shrink-0 p-0"
                        >
                          {speech.listening ? <MicOff className="h-5 w-5 text-primary" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="micro-label mb-1.5 block" htmlFor="sweep-last-sale">Last sale date (optional)</label>
                    <Input
                      id="sweep-last-sale"
                      type="date"
                      value={lastSale}
                      onChange={(e) => setLastSale(e.target.value)}
                      className="min-h-12 max-w-[220px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" className="min-h-12" onClick={() => setMode('choose')} disabled={saving}>
                      Back
                    </Button>
                    <Button className="min-h-12 flex-1 rounded-xl" onClick={saveGone} disabled={saving}>
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save and next'}
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'here' && (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="micro-label mb-1.5 block" htmlFor="sweep-committed">Committed last day</label>
                    <Input
                      id="sweep-committed"
                      type="date"
                      value={committedLastDay}
                      onChange={(e) => setCommittedLastDay(e.target.value)}
                      className="min-h-12 max-w-[220px]"
                    />
                    {!committedLastDay && (
                      <p className="mt-1 text-[12px] text-amber-400">Not set — stays a gap</p>
                    )}
                  </div>

                  <div>
                    <p className="micro-label mb-1.5">Next season</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {NEXT_SEASON.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNextStatus(s)}
                          className={cn(
                            'min-h-12 rounded-lg border px-2 text-[13px] font-semibold',
                            nextStatus === s
                              ? 'border-primary/40 bg-primary text-primary-foreground'
                              : 'border-border/60 bg-surface text-muted-foreground'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {!nextStatus && (
                      <p className="mt-1 text-[12px] text-amber-400">Not set — stays a gap</p>
                    )}
                  </div>

                  <div>
                    <label className="micro-label mb-1.5 block" htmlFor="sweep-office">Office</label>
                    <select
                      id="sweep-office"
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className="h-12 w-full rounded-lg border border-white/[0.08] bg-background/50 px-3 text-[14px] text-foreground"
                    >
                      <option value="">Not set</option>
                      {(queue?.offices ?? []).map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    {officeName && <p className="mt-1 text-[12px] text-muted-foreground">Confirmed as {officeName}</p>}
                  </div>

                  <div>
                    <label className="micro-label mb-1.5 block" htmlFor="sweep-showed-up">Showed up date (optional)</label>
                    <Input
                      id="sweep-showed-up"
                      type="date"
                      value={showedUp}
                      onChange={(e) => setShowedUp(e.target.value)}
                      className="min-h-12 max-w-[220px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" className="min-h-12" onClick={() => setMode('choose')} disabled={saving}>
                      Back
                    </Button>
                    <Button className="min-h-12 flex-1 rounded-xl" onClick={saveHere} disabled={saving}>
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save and next'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sweep controls */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="min-h-12 flex-1" onClick={advance} disabled={saving}>
                <SkipForward className="mr-2 h-4 w-4" /> Skip
              </Button>
              <Button variant="outline" className="min-h-12 flex-1" onClick={undo} disabled={!lastAction || saving}>
                <Undo2 className="mr-2 h-4 w-4" /> Undo last
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
