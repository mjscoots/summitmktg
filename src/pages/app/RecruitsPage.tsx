import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users, Loader2, Phone, MapPin, Clock, Sparkles, Lock, RefreshCw, Plus, RotateCcw, Handshake,
} from 'lucide-react';
import { isManagerOrAbove } from '@/lib/roles';
import { ResignBoard } from '@/components/recruiting/ResignBoard';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { WinMoment } from '@/components/chat/WinMoment';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const MAX_ACTIVE_CLAIMS = 4;
const RELEASE_HOURS = 48;

const MY_STATUSES = ['Claimed', 'Contacted', 'Booked', 'Signed', 'Dead'] as const;

const STATUS_STYLE: Record<string, string> = {
  New: 'bg-muted/40 text-muted-foreground border-border/50',
  Claimed: 'bg-primary/15 text-primary border-primary/30',
  Contacted: 'bg-primary/15 text-primary border-primary/30',
  Booked: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Signed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Dead: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface BoardLead {
  id: string;
  first_name: string;
  city: string | null;
  interest_reason: string | null;
  ref_code: string | null;
  created_at: string;
}

interface MyLead extends BoardLead {
  phone: string | null;
  status: string;
  claimed_at: string | null;
  last_activity_at: string | null;
  notes: string | null;
}

interface ReferralLead {
  id: string;
  first_name: string;
  city: string | null;
  interest_reason: string | null;
  status: string;
  claimed_by: string | null;
  claimed_name: string | null;
  referrer_name: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function releaseCountdown(lead: MyLead) {
  const anchor = lead.last_activity_at || lead.claimed_at;
  if (!anchor) return null;
  const deadline = new Date(anchor).getTime() + RELEASE_HOURS * 3600 * 1000;
  const msLeft = deadline - Date.now();
  if (msLeft <= 0) return 'Releasing now';
  const hours = Math.floor(msLeft / 3600000);
  if (hours >= 1) return `Auto-releases in ${hours}h`;
  return `Auto-releases in ${Math.max(1, Math.floor(msLeft / 60000))}m`;
}

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

export default function RecruitsPage() {
  const { user, role } = useAuth();
  const isManagerRole = isManagerOrAbove(role);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'board' | 'mine' | 'winback' | 'resigns' | 'referrals'>(() => {
    const t = searchParams.get('tab');
    if ((t === 'winback' || t === 'resigns' || t === 'referrals') && isManagerRole) return t;
    return t === 'mine' ? 'mine' : 'board';
  });

  const [board, setBoard] = useState<BoardLead[]>([]);
  const [mine, setMine] = useState<MyLead[]>([]);
  const [referrals, setReferrals] = useState<ReferralLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', phone: '', city: '', interest_reason: '', notes: '' });
  const [, setTick] = useState(0);
  const [winMoment, setWinMoment] = useState<{ firstName: string; signedCount: number | null } | null>(null);

  const activeClaims = mine.filter((l) => l.status === 'Claimed' || l.status === 'Contacted').length;
  const atLimit = activeClaims >= MAX_ACTIVE_CLAIMS;

  const load = useCallback(async () => {
    if (!user) return;
    // Sweep any leads that went stale before rendering the board
    await (supabase as any).rpc('release_stale_leads');
    const [boardRes, mineRes, refRes] = await Promise.all([
      (supabase as any).rpc('get_lead_board'),
      (supabase as any).rpc('get_my_leads'),
      isManagerRole ? (supabase as any).rpc('get_referral_leads') : Promise.resolve({ data: [] }),
    ]);
    setBoard((boardRes.data as BoardLead[]) || []);
    setReferrals((refRes.data as ReferralLead[]) || []);
    const myLeads = (mineRes.data as MyLead[]) || [];
    setMine(myLeads);
    setNoteDrafts((prev) => {
      const next = { ...prev };
      myLeads.forEach((l) => {
        if (next[l.id] === undefined) next[l.id] = l.notes || '';
      });
      return next;
    });
    setLoading(false);
  }, [user, isManagerRole]);


  useEffect(() => { load(); }, [load]);

  // Keep countdowns and "time since arrival" live
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const claim = async (leadId: string) => {
    setClaiming(leadId);
    const { data, error } = await (supabase as any).rpc('claim_lead', { _lead_id: leadId });
    setClaiming(null);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not claim that lead');
      load();
      return;
    }
    toast.success('Lead claimed — phone unlocked');
    setTab('mine');
    load();
  };

  const updateLead = async (leadId: string, status: string | null, notes: string | null) => {
    const lead = mine.find((l) => l.id === leadId);
    const wasSigned = lead?.status === 'Signed';
    setMine((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: status ?? l.status, notes: notes ?? l.notes, last_activity_at: new Date().toISOString() }
          : l
      )
    );
    const { data, error } = await (supabase as any).rpc('update_my_lead', {
      _lead_id: leadId,
      _status: status,
      _notes: notes,
    });
    if (error || !data?.success) {
      toast.error('Save failed');
      load();
      return;
    }
    if (status === 'Signed' && !wasSigned) {
      setWinMoment({
        firstName: (lead?.first_name || 'Your recruit').split(' ')[0],
        signedCount: typeof data.signed_count === 'number' ? data.signed_count : null,
      });
    }
  };

  const addManualLead = async () => {
    if (!form.first_name.trim()) {
      toast.error('Add a name first');
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('add_manual_lead', {
      _first_name: form.first_name,
      _phone: form.phone || null,
      _city: form.city || null,
      _interest_reason: form.interest_reason || null,
      _notes: form.notes || null,
    });
    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Could not add that lead');
      return;
    }
    toast.success('Lead added to My Leads');
    setForm({ first_name: '', phone: '', city: '', interest_reason: '', notes: '' });
    setAddOpen(false);
    setTab('mine');
    load();
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Home" />

          {/* Header */}
          <PageHeader
            title={tab === 'board' ? 'Lead board' : tab === 'mine' ? 'My leads' : tab === 'resigns' ? 'Re-signs' : 'Win-back board'}
            context={
              tab === 'board'
                ? `${board.length} unclaimed ${board.length === 1 ? 'lead' : 'leads'} on the board`
                : tab === 'mine'
                  ? `${activeClaims} of ${MAX_ACTIVE_CLAIMS} active claims`
                  : tab === 'resigns'
                    ? 'Where every rep stands for next season'
                    : 'Former reps with a phone number — cold calls to bring them back'
            }
            className="mb-5"
            action={
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add lead
              </button>
            }
          />
          <div className="mb-5 flex justify-end">
            <button
              onClick={load}
              className="micro-label inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className={cn('mb-5 grid gap-2', isManagerRole ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
            {([
              { id: 'board' as const, label: 'Lead board', icon: Sparkles, count: board.length },
              { id: 'mine' as const, label: 'My leads', icon: Users, count: mine.length },
              ...(isManagerRole
                ? [
                    { id: 'resigns' as const, label: 'Re-signs', icon: Handshake, count: null as number | null },
                    { id: 'referrals' as const, label: 'Referrals', icon: Handshake, count: referrals.length as number | null },
                  ]
                : []),
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-bold transition-all duration-180 sm:text-[13px] sm:px-3.5',
                  tab === t.id
                    ? 'border-primary/40 bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'border-border/50 bg-surface text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                <t.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
                {t.count !== null && (
                  <span className={cn('text-[11px] font-black tabular-nums', tab === t.id ? 'opacity-80' : 'text-primary')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>


          {tab === 'referrals' && isManagerRole ? (
            referrals.length === 0 ? (
              <div className={cn(CARD, 'py-4')}>
                <EmptyState
                  icon={Handshake}
                  title="No referrals yet"
                  description="Names your reps send from Home land here."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {referrals.map((lead) => (
                  <div key={lead.id} className={cn(CARD, 'flex flex-col p-4')}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-bold text-foreground">{lead.first_name}</h3>
                      <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(lead.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Referred by {lead.referrer_name || 'a rep'}
                    </p>
                    {lead.city && (
                      <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {lead.city}
                      </p>
                    )}
                    {lead.claimed_by ? (
                      <p className="mt-3 text-[12px] text-muted-foreground">
                        {lead.status} · {lead.claimed_name || 'Claimed'}
                      </p>
                    ) : atLimit ? (
                      <button
                        disabled
                        className="mt-3 min-h-11 w-full cursor-not-allowed rounded-lg border border-white/[0.06] bg-white/[0.03] text-[13px] font-semibold text-muted-foreground"
                      >
                        Claim Lead
                      </button>
                    ) : (
                      <button
                        onClick={() => claim(lead.id)}
                        disabled={claiming === lead.id}
                        className="mt-3 min-h-11 w-full rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-60"
                      >
                        {claiming === lead.id ? 'Claiming…' : 'Claim Lead'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : tab === 'resigns' && isManagerRole ? (
            <ResignBoard isAdmin={role === 'admin' || role === 'owner'} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[132px] rounded-[var(--radius)]" />
              ))}
            </div>
          ) : tab === 'board' ? (
            board.length === 0 ? (
              <div className={cn(CARD, 'py-4')}>
                <EmptyState
                  icon={Sparkles}
                  title="Board is clear"
                  description="Every lead is claimed. New ones land here the moment a ticket comes in."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {board.map((lead) => (
                  <div key={lead.id} className={cn(CARD, 'p-4 flex flex-col')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold text-foreground">{lead.first_name}</h3>
                        {Date.now() - new Date(lead.created_at).getTime() < 86_400_000 && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            New today
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(lead.created_at)}
                      </span>
                    </div>

                    {lead.city && (
                      <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lead.city}
                      </p>
                    )}
                    {lead.interest_reason && (
                      <span className="mt-2.5 self-start rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                        {lead.interest_reason}
                      </span>
                    )}
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Lock className="w-3 h-3" /> Phone hidden until claimed
                    </div>

                    {atLimit ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            disabled
                            className="mt-3 w-full rounded-lg bg-white/[0.03] border border-white/[0.06] py-2 text-[13px] font-semibold text-muted-foreground cursor-not-allowed"
                          >
                            Claim Lead
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Close out your current leads first.</TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => claim(lead.id)}
                        disabled={claiming === lead.id}
                        className="mt-3 w-full rounded-lg bg-primary py-2 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-60"
                      >
                        {claiming === lead.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…
                          </span>
                        ) : (
                          'Claim Lead'
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : mine.length === 0 ? (
            <div className={cn(CARD, 'p-10 text-center')}>
              <p className="text-sm text-muted-foreground">You haven’t claimed any leads yet.</p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Add a lead manually
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mine.map((lead) => {
                const countdown =
                  lead.status === 'Claimed' || lead.status === 'Contacted' ? releaseCountdown(lead) : null;
                return (
                  <div key={lead.id} className={cn(CARD, 'p-4')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-foreground">{lead.first_name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-muted-foreground">
                          {lead.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {lead.city}
                            </span>
                          )}
                          {lead.interest_reason && <span>{lead.interest_reason}</span>}
                          {lead.ref_code && <span className="text-primary/70">ref {lead.ref_code}</span>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          STATUS_STYLE[lead.status],
                          lead.status === 'Signed' && 'signed-shimmer'
                        )}
                      >
                        {lead.status}
                      </span>
                    </div>

                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-[13px] font-semibold text-primary"
                      >
                        <Phone className="w-3.5 h-3.5" /> {lead.phone}
                      </a>
                    ) : (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> No phone on file
                      </p>
                    )}

                    <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Select value={lead.status} onValueChange={(v) => updateLead(lead.id, v, null)}>
                        <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px] bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MY_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-[13px]">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {countdown && (
                        <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {countdown}
                        </span>
                      )}
                    </div>

                    <textarea
                      value={noteDrafts[lead.id] ?? ''}
                      onChange={(e) => setNoteDrafts((p) => ({ ...p, [lead.id]: e.target.value }))}
                      onBlur={() => {
                        const draft = noteDrafts[lead.id] ?? '';
                        if (draft !== (lead.notes || '')) updateLead(lead.id, null, draft);
                      }}
                      rows={2}
                      maxLength={4000}
                      placeholder="Notes"
                      className="mt-3 w-full rounded-lg bg-background/50 border border-white/[0.06] px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 resize-y"
                    />
                  </div>
                );
              })}
            </div>
          )}
          {/* Add lead manually */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Add a lead</DialogTitle>
                <DialogDescription>
                  Added leads are assigned to you immediately and tagged “manual”.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                  maxLength={120}
                />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone (optional)"
                  inputMode="tel"
                  maxLength={40}
                />
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="City (optional)"
                  maxLength={80}
                />
                <Input
                  value={form.interest_reason}
                  onChange={(e) => setForm((f) => ({ ...f, interest_reason: e.target.value }))}
                  placeholder="Interest reason (optional)"
                  maxLength={120}
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  maxLength={4000}
                  placeholder="Notes (optional)"
                  className="w-full rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
                />
              </div>
              <DialogFooter>
                <button
                  onClick={addManualLead}
                  disabled={saving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add lead
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <WinMoment
            open={winMoment !== null}
            firstName={winMoment?.firstName || ''}
            signedCount={winMoment?.signedCount ?? null}
            onDismiss={() => setWinMoment(null)}
          />
        </main>
      </div>
    </AppLayout>
  );
}
