import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, Target, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Input } from '@/components/ui/input';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

const STATUSES = ['Signed', 'Verbal', 'Undecided', 'Not returning', 'No answer'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<string, string> = {
  Signed: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  Verbal: 'border-primary/30 bg-primary/15 text-primary',
  Undecided: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
  'Not returning': 'border-red-500/30 bg-red-500/15 text-red-400',
  'No answer': 'border-border/60 bg-surface text-muted-foreground',
};

interface Rep {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  direct_manager: string | null;
  rep_year: string | null;
  next_year_status: string | null;
  next_year_status_at: string | null;
  next_year_notes: string | null;
  committed_last_day: string | null;
  is_alumni: boolean;
}

function touched(iso: string | null) {
  if (!iso) return 'Never touched';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Updated ${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

export function ResignBoard({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [reps, setReps] = useState<Rep[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [signed, setSigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [targetDraft, setTargetDraft] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc('get_resign_board');
    if (error || data?.error) {
      toast.error('Could not load the re-sign board');
      setLoading(false);
      return;
    }
    setReps((data.reps as Rep[]) || []);
    setTarget(typeof data.target === 'number' ? data.target : null);
    setSigned(data.signed || 0);
    setTargetDraft(data.target != null ? String(data.target) : '');
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const setStatus = async (rep: Rep, status: Status) => {
    setBusy(rep.user_id + status);
    const { data, error } = await (supabase as any).rpc('set_next_year_status', {
      _user_id: rep.user_id,
      _status: status,
      _notes: notes[rep.user_id]?.trim() || null,
    });
    setBusy(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not save that status');
      return;
    }
    if (status === 'Signed' && rep.next_year_status !== 'Signed') {
      toast.success(`${rep.full_name || 'Rep'} is signed for next season - posted to #wins`);
    } else {
      toast.success('Saved');
    }
    setNotes((p) => ({ ...p, [rep.user_id]: '' }));
    load();
  };

  const saveTarget = async () => {
    const value = targetDraft.trim();
    if (value && !/^\d+$/.test(value)) { toast.error('Use a whole number'); return; }
    const { error } = await supabase.from('app_settings').upsert(
      { key: 'resign_headcount_target', value },
      { onConflict: 'key' }
    );
    if (error) { toast.error('Could not save the target'); return; }
    setTarget(value ? Number(value) : null);
    toast.success('Target saved');
  };

  const sorted = useMemo(() => {
    const rank: Record<string, number> = { Signed: 0, Verbal: 1, Undecided: 2, 'No answer': 3, 'Not returning': 4 };
    return [...reps].sort((a, b) => {
      const ra = rank[a.next_year_status || 'Undecided'] ?? 2;
      const rb = rank[b.next_year_status || 'Undecided'] ?? 2;
      if (ra !== rb) return ra - rb;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [reps]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[96px] rounded-[var(--radius)]" />)}
      </div>
    );
  }

  const pct = target && target > 0 ? Math.min(100, (signed / target) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className={cn(CARD, 'p-4')}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] font-bold text-foreground tabular-nums">
            {signed} signed for next season
          </p>
          {target != null && (
            <p className="text-[12px] tabular-nums text-muted-foreground">Target {target}</p>
          )}
        </div>
        {pct != null && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        {isAdmin && (
          <div className="mt-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              placeholder="Headcount target"
              inputMode="numeric"
              className="h-10 max-w-[160px]"
              aria-label="Next-season headcount target"
            />
            <button
              onClick={saveTarget}
              className="micro-label min-h-10 rounded-lg border border-border/60 bg-surface px-3 transition-colors hover:border-primary/30 hover:text-foreground"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {sorted.map((rep) => (
          <div key={rep.user_id} className={cn(CARD, 'p-4')}>
            <div className="flex items-start gap-3">
              <UserAvatar fullName={rep.full_name || ""} avatarUrl={rep.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-bold text-foreground">{rep.full_name || '-'}</h3>
                  {rep.is_alumni && (
                    <span className="shrink-0 rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Alumni
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      STATUS_STYLE[rep.next_year_status || 'No answer']
                    )}
                  >
                    {rep.next_year_status || 'No answer'}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {rep.rep_year ? `${rep.rep_year} · ` : ''}{touched(rep.next_year_status_at)}
                </p>
                {rep.next_year_notes && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">{rep.next_year_notes}</p>
                )}
              </div>
            </div>

            <input
              value={notes[rep.user_id] ?? ''}
              onChange={(e) => setNotes((p) => ({ ...p, [rep.user_id]: e.target.value }))}
              placeholder="Note (optional)"
              className="mt-3 min-h-11 w-full rounded-lg border border-white/[0.06] bg-background/50 px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
            />

            <div className="mt-2.5 flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = rep.next_year_status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(rep, s)}
                    disabled={busy === rep.user_id + s}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors disabled:opacity-60',
                      active
                        ? STATUS_STYLE[s]
                        : 'border-border/60 bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    {busy === rep.user_id + s ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : active ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : null}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
