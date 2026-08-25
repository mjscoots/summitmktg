import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, CalendarDays, Handshake } from 'lucide-react';
import { UserAutocomplete } from '@/components/one-on-one/UserAutocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

const INTENTS = ['Coming back', 'Undecided', 'Not returning'] as const;
type Intent = (typeof INTENTS)[number];

interface OverviewRep {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  direct_manager: string | null;
  committed_last_day: string | null;
  next_year_status: string | null;
  has_interview: boolean;
  interview_at: string | null;
  next_year_intent: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CommitmentInterviewContent() {
  const { user } = useAuth();
  const [repName, setRepName] = useState('');
  const [repId, setRepId] = useState<string | null>(null);
  const [lastDay, setLastDay] = useState('');
  const [whyHere, setWhyHere] = useState('');
  const [intent, setIntent] = useState<Intent>('Undecided');
  const [better, setBetter] = useState('');
  const [termsAck, setTermsAck] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState<OverviewRep[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('get_commitment_overview');
    if (data?.reps) setOverview(data.reps as OverviewRep[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const submit = async () => {
    if (!repId) { toast.error('Pick a rep from the list'); return; }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('submit_commitment_interview', {
      _rep_id: repId,
      _committed_last_day: lastDay || null,
      _why_here: whyHere || null,
      _next_year_intent: intent,
      _better_next_year: better || null,
      _terms_acknowledged: termsAck,
      _terms_text: termsText || null,
    });
    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that interview');
      return;
    }
    toast.success('Commitment interview saved');
    setRepName(''); setRepId(null); setLastDay(''); setWhyHere('');
    setIntent('Undecided'); setBetter(''); setTermsAck(false); setTermsText('');
    load();
  };

  const { done, pending } = useMemo(() => ({
    done: overview.filter((r) => r.has_interview),
    pending: overview.filter((r) => !r.has_interview),
  }), [overview]);

  return (
    <div className="space-y-8">
      {/* Form */}
      <section className={cn(CARD, 'p-5 sm:p-6')}>
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/25 to-primary/10">
            <Handshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Commitment Interview</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              One per rep this season. Saving writes their committed last day to their profile.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="micro-label mb-1.5 block">Rep</label>
            <UserAutocomplete
              value={repName}
              selectedUserId={repId}
              onChange={(name, id) => { setRepName(name); setRepId(id); }}
              placeholder="Start typing a name…"
            />
          </div>

          <div>
            <label className="micro-label mb-1.5 block" htmlFor="ci-last-day">Committed last day</label>
            <Input id="ci-last-day" type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} className="max-w-[220px]" />
          </div>

          <div>
            <label className="micro-label mb-1.5 block" htmlFor="ci-why">Why are you here / what do you want from the season</label>
            <textarea
              id="ci-why"
              value={whyHere}
              onChange={(e) => setWhyHere(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
              placeholder="Their words"
            />
          </div>

          <div>
            <label className="micro-label mb-1.5 block">Next-year intent</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {INTENTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntent(i)}
                  className={cn(
                    'min-h-11 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                    intent === i
                      ? 'border-primary/40 bg-primary text-primary-foreground'
                      : 'border-border/60 bg-surface text-muted-foreground hover:text-foreground'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="micro-label mb-1.5 block" htmlFor="ci-better">What would make next year better</label>
            <textarea
              id="ci-better"
              value={better}
              onChange={(e) => setBetter(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
            />
          </div>

          <div>
            <label className="micro-label mb-1.5 block" htmlFor="ci-terms">Terms</label>
            <textarea
              id="ci-terms"
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="e.g. rent bonus terms if leaving early"
              className="w-full resize-y rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
            />
            <label className="mt-2.5 flex min-h-11 items-center gap-2.5 text-[13px] text-foreground">
              <input
                type="checkbox"
                checked={termsAck}
                onChange={(e) => setTermsAck(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Terms acknowledged by the rep
            </label>
          </div>

          <Button onClick={submit} disabled={saving} className="min-h-11 w-full rounded-xl sm:w-auto">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save interview'}
          </Button>
        </div>
      </section>

      {/* Overview */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="micro-label">Who has had one this season</p>
          <p className="text-[12px] tabular-nums text-muted-foreground">
            {done.length} of {overview.length} done
          </p>
        </div>
        {loading ? (
          <div className={cn(CARD, 'p-6 text-center text-[13px] text-muted-foreground')}>Loading…</div>
        ) : overview.length === 0 ? (
          <div className={cn(CARD, 'p-6 text-center text-[13px] text-muted-foreground')}>No active reps yet.</div>
        ) : (
          <div className={cn(CARD, 'divide-y divide-white/[0.05]')}>
            {[...pending, ...done].map((r) => (
              <div key={r.user_id} className="flex items-center gap-3 p-3">
                <UserAvatar fullName={r.full_name || ""} avatarUrl={r.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-foreground">{r.full_name || '—'}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {r.committed_last_day ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> Last day {fmtDate(r.committed_last_day)}
                      </span>
                    ) : (
                      'No committed last day'
                    )}
                    {r.next_year_intent ? ` · ${r.next_year_intent}` : ''}
                  </p>
                </div>
                {r.has_interview ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Not yet
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
