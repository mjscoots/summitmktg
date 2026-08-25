import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Phone, Lock, Loader2, Clock, MapPin, RotateCcw, PhoneOff, Voicemail,
  ThumbsDown, CalendarClock, Check, ArrowRight, Star, DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Link } from 'react-router-dom';
import { WinbackGoldImport } from '@/components/recruiting/WinbackGoldImport';
import { isManagerOrAbove } from '@/lib/roles';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';
const RECENT_DAYS = 14;


export const WINBACK_OUTCOMES = [
  { id: 'no_answer', label: 'No answer', icon: PhoneOff },
  { id: 'voicemail', label: 'Left voicemail', icon: Voicemail },
  { id: 'not_interested', label: 'Talked — not interested', icon: ThumbsDown },
  { id: 'maybe_later', label: 'Talked — maybe later', icon: CalendarClock },
  { id: 'coming_back', label: 'Coming back', icon: Check },
] as const;

const OUTCOME_LABEL: Record<string, string> = WINBACK_OUTCOMES.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<string, string>
);

interface GoldFields {
  revenue_total: number | null;
  weeks_active: number | null;
  last_sale_date: string | null;
  story: string | null;
  priority: boolean | null;
}

interface PoolLead extends GoldFields {
  id: string;
  name: string;
  city: string | null;
  notes: string | null;
  contact_count: number;
  last_contact_at: string | null;
  last_outcome: string | null;
  last_by: string | null;
}

interface MineLead extends GoldFields {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  notes: string | null;
  contact_count: number;
  last_contact_at: string | null;
  claimed_at: string | null;
  last_activity_at: string | null;
}

interface ReturningLead {
  id: string;
  name: string;
  city: string | null;
  notes: string | null;
  phone: string | null;
  source_profile_id: string | null;
  sourced_by_name: string | null;
  last_activity_at: string | null;
}

interface Feed {
  pool: PoolLead[];
  mine: MineLead[];
  returning: ReturningLead[];
  my_active: number;
  cap: number;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSince(iso: string | null) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function releaseCountdown(lead: MineLead) {
  const anchor = lead.last_activity_at || lead.claimed_at;
  if (!anchor) return null;
  const msLeft = new Date(anchor).getTime() + 48 * 3600 * 1000 - Date.now();
  if (msLeft <= 0) return 'Returning to the pool now';
  const hours = Math.floor(msLeft / 3600000);
  if (hours >= 1) return `Back to the pool in ${hours}h if no outcome`;
  return `Back to the pool in ${Math.max(1, Math.floor(msLeft / 60000))}m if no outcome`;
}

type SortMode = 'default' | 'rev_per_week' | 'recent_sale';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'default', label: 'Longest untouched' },
  { id: 'rev_per_week', label: 'Revenue per week' },
  { id: 'recent_sale', label: 'Most recent sale' },
];

function fmtMoney(n: number | null) {
  if (n == null) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

export function WinbackTab({ isAdmin, focusId }: { isAdmin: boolean; focusId?: string | null }) {
  const { user, role } = useAuth();
  const canFlag = isManagerOrAbove(role);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortMode>('default');

  const load = useCallback(async () => {
    if (!user) return;
    await (supabase as any).rpc('release_stale_leads');
    const { data, error } = await (supabase as any).rpc('get_winback_feed');
    if (error || data?.error) {
      toast.error('Could not load the win-back board');
      setLoading(false);
      return;
    }
    setFeed(data as Feed);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const claim = async (id: string) => {
    setBusy(id);
    const { data, error } = await (supabase as any).rpc('claim_winback', { _lead_id: id });
    setBusy(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not claim that win-back');
      load();
      return;
    }
    toast.success('Claimed — number unlocked');
    load();
  };

  const logOutcome = async (id: string, outcome: string) => {
    setBusy(id + outcome);
    const { data, error } = await (supabase as any).rpc('log_winback_contact', {
      _lead_id: id,
      _outcome: outcome,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that outcome');
      load();
      return;
    }
    setNotes((p) => ({ ...p, [id]: '' }));
    toast.success(
      outcome === 'coming_back'
        ? 'Marked as coming back — managers notified'
        : 'Logged — back to the pool for someone else'
    );
    load();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (!feed) return null;

  const fresh = feed.pool.filter((l) => daysSince(l.last_contact_at) >= RECENT_DAYS);
  const recent = feed.pool.filter((l) => daysSince(l.last_contact_at) < RECENT_DAYS);
  const atCap = feed.my_active >= feed.cap;

  const PoolCard = ({ lead, muted }: { lead: PoolLead; muted?: boolean }) => (
    <div className={cn(CARD, 'flex flex-col p-4', muted && 'opacity-55')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold text-foreground">{lead.name}</h3>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {lead.contact_count} {lead.contact_count === 1 ? 'attempt' : 'attempts'}
        </span>
      </div>
      {lead.city && (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {lead.city}
        </p>
      )}
      <p className="mt-2 text-[12px] text-muted-foreground">
        {lead.last_contact_at
          ? `Last contacted: ${fmtDate(lead.last_contact_at)}${lead.last_by ? ` by ${lead.last_by}` : ''}${
              lead.last_outcome ? ` — ${OUTCOME_LABEL[lead.last_outcome] || lead.last_outcome}` : ''
            }`
          : 'Never contacted'}
      </p>
      {lead.notes && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">{lead.notes}</p>}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Number hidden until claimed
      </div>
      <button
        onClick={() => claim(lead.id)}
        disabled={atCap || busy === lead.id}
        className={cn(
          'mt-3 min-h-11 w-full rounded-lg py-2 text-[13px] font-semibold transition-transform active:scale-[0.98]',
          atCap
            ? 'cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-muted-foreground'
            : 'bg-primary text-primary-foreground shadow-md shadow-primary/25 disabled:opacity-60'
        )}
      >
        {busy === lead.id ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming…
          </span>
        ) : atCap ? (
          `Holding ${feed.cap} already`
        ) : (
          'Claim to call'
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Returning */}
      {feed.returning.length > 0 && (
        <section>
          <p className="micro-label mb-2">Coming back</p>
          <div className="space-y-3">
            {feed.returning.map((lead) => (
              <div
                key={lead.id}
                className={cn(
                  'rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 backdrop-blur-sm',
                  focusId === lead.id && 'ring-2 ring-emerald-400/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-foreground">{lead.name}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Wants back in{lead.sourced_by_name ? ` — sourced by ${lead.sourced_by_name}` : ''}
                      {lead.last_activity_at ? ` on ${fmtDate(lead.last_activity_at)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Returning
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-[13px] font-semibold text-emerald-400"
                    >
                      <Phone className="h-3.5 w-3.5" /> {lead.phone}
                    </a>
                  )}
                  {isAdmin && (
                    <Link
                      to={`/admin/team?tab=archived&q=${encodeURIComponent(lead.name)}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/30"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore their account
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My claimed win-backs */}
      {feed.mine.length > 0 && (
        <section>
          <p className="micro-label mb-2">
            My win-backs — {feed.my_active} of {feed.cap}
          </p>
          <div className="space-y-3">
            {feed.mine.map((lead) => {
              const countdown = releaseCountdown(lead);
              return (
                <div key={lead.id} className={cn(CARD, 'p-4', focusId === lead.id && 'ring-2 ring-primary/40')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-foreground">{lead.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        {lead.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {lead.city}
                          </span>
                        )}
                        <span>
                          {lead.contact_count} {lead.contact_count === 1 ? 'attempt' : 'attempts'} so far
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      Claimed
                    </span>
                  </div>

                  {lead.notes && (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{lead.notes}</p>
                  )}

                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 text-[13px] font-semibold text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" /> {lead.phone}
                    </a>
                  )}

                  <textarea
                    value={notes[lead.id] ?? ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [lead.id]: e.target.value }))}
                    rows={2}
                    maxLength={2000}
                    placeholder="Note for the next rep (optional)"
                    className="mt-3 w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WINBACK_OUTCOMES.map((o) => {
                      const isWin = o.id === 'coming_back';
                      return (
                        <button
                          key={o.id}
                          onClick={() => logOutcome(lead.id, o.id)}
                          disabled={busy === lead.id + o.id}
                          className={cn(
                            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors disabled:opacity-60',
                            isWin
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 sm:col-span-2'
                              : 'border-border/60 bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground'
                          )}
                        >
                          {busy === lead.id + o.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <o.icon className="h-3.5 w-3.5" />
                          )}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>

                  {countdown && (
                    <p className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-amber-400">
                      <Clock className="h-3 w-3" /> {countdown}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pool */}
      <section>
        <p className="micro-label mb-2">
          Pool — {feed.pool.length} former {feed.pool.length === 1 ? 'rep' : 'reps'}
        </p>
        {feed.pool.length === 0 ? (
          <div className={cn(CARD, 'py-4')}>
            <EmptyState
              icon={RotateCcw}
              title="Nobody in the pool"
              description="Every former rep on the list is claimed right now."
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fresh.map((lead) => (
                <PoolCard key={lead.id} lead={lead} />
              ))}
            </div>
            {recent.length > 0 && (
              <>
                <p className="micro-label mb-2 mt-5">
                  Contacted in the last {RECENT_DAYS} days — leave these alone for now
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((lead) => (
                    <PoolCard key={lead.id} lead={lead} muted />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
