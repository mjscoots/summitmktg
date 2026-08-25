import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Search, Save, Loader2, DollarSign, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingList } from '@/components/shared/LoadingList';
import { PayScale, PAY_SCALE_LABELS, formatCurrency, formatRate, getRate, getTier, formatTierRange } from '@/lib/commission';
import { cn } from '@/lib/utils';
import { RevenueEntryPanel } from '@/components/admin/RevenueEntryPanel';
import { LeaderboardImportPanel } from '@/components/admin/LeaderboardImportPanel';
import { RanksStacksPanel } from '@/components/admin/RanksStacksPanel';
import { FiberInstallsPanel } from '@/components/admin/FiberInstallsPanel';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface RepRow {
  user_id: string;
  full_name: string;
  email: string;
  team_id: string | null;
}

interface Draft {
  pay_scale: PayScale;
  signs: string;
  avg_account_value: string;
  active_revenue: string;
  rate_override: string;
  commission_notes: string;
  monthly_cost: string;
  location: string;
  housing_notes: string;
}

const emptyDraft: Draft = {
  pay_scale: 'rookie',
  signs: '',
  avg_account_value: '',
  active_revenue: '',
  rate_override: '',
  commission_notes: '',
  monthly_cost: '',
  location: '',
  housing_notes: '',
};

const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/[$,%\s,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function AdminMoneyTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pay' | 'revenue' | 'import' | 'fiber' | 'ranks'>('pay');
  const [reps, setReps] = useState<RepRow[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [commissions, setCommissions] = useState<Map<string, any>>(new Map());
  const [housings, setHousings] = useState<Map<string, any>>(new Map());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, t, c, h] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, team_id').eq('archived', false).order('full_name'),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('rep_commission').select('*'),
      supabase.from('rep_housing').select('*'),
    ]);
    setReps((p.data as RepRow[]) ?? []);
    setTeams(t.data ?? []);
    setCommissions(new Map((c.data ?? []).map((r: any) => [r.user_id, r])));
    setHousings(new Map((h.data ?? []).map((r: any) => [r.user_id, r])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const teamName = (id: string | null) => (id ? teams.find(t => t.id === id)?.name ?? '—' : '—');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter(r => r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
  }, [reps, search]);

  const openRep = (userId: string) => {
    if (selected === userId) {
      setSelected(null);
      return;
    }
    const c = commissions.get(userId);
    const h = housings.get(userId);
    setDraft({
      pay_scale: (['rookie', 'veteran', 'marketing'].includes(c?.pay_scale) ? c.pay_scale : 'rookie') as PayScale,
      signs: c?.signs != null ? String(c.signs) : '',
      avg_account_value: c?.avg_account_value != null ? String(c.avg_account_value) : '',
      active_revenue: c?.active_revenue != null ? String(c.active_revenue) : '',
      rate_override: c?.rate_override != null ? String(Number(c.rate_override) * 100) : '',
      commission_notes: c?.notes ?? '',
      monthly_cost: h?.monthly_cost != null ? String(h.monthly_cost) : '',
      location: h?.location ?? '',
      housing_notes: h?.notes ?? '',
    });
    setSelected(userId);
  };

  const save = async (userId: string) => {
    setSaving(true);
    try {
      const ratePct = num(draft.rate_override);
      const commissionPayload = {
        user_id: userId,
        pay_scale: draft.pay_scale,
        signs: num(draft.signs) ?? 0,
        avg_account_value: num(draft.avg_account_value),
        active_revenue: num(draft.active_revenue),
        rate_override: ratePct !== null ? ratePct / 100 : null,
        notes: draft.commission_notes.trim() || null,
        updated_by: user?.id ?? null,
      };
      const housingPayload = {
        user_id: userId,
        monthly_cost: num(draft.monthly_cost),
        location: draft.location.trim() || null,
        notes: draft.housing_notes.trim() || null,
        updated_by: user?.id ?? null,
      };

      const hasHousing =
        housingPayload.monthly_cost !== null || housingPayload.location || housingPayload.notes;

      const results = await Promise.all([
        supabase.from('rep_commission').upsert(commissionPayload, { onConflict: 'user_id' }),
        hasHousing
          ? supabase.from('rep_housing').upsert(housingPayload, { onConflict: 'user_id' })
          : Promise.resolve({ error: null } as any),
      ]);

      const failure = results.find(r => r.error);
      if (failure?.error) throw failure.error;

      toast.success('Saved');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const nav = (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={view === 'pay' ? 'default' : 'outline'} onClick={() => setView('pay')}>
        Pay & housing
      </Button>
      <Button size="sm" variant={view === 'revenue' ? 'default' : 'outline'} onClick={() => setView('revenue')}>
        Monthly revenue
      </Button>
      <Button size="sm" variant={view === 'import' ? 'default' : 'outline'} onClick={() => setView('import')}>
        Import
      </Button>
      <Button size="sm" variant={view === 'fiber' ? 'default' : 'outline'} onClick={() => setView('fiber')}>
        Fiber
      </Button>
      <Button size="sm" variant={view === 'ranks' ? 'default' : 'outline'} onClick={() => setView('ranks')}>
        Ranks & Stacks
      </Button>
    </div>
  );

  if (view === 'revenue') {
    return (
      <div className="space-y-4">
        {nav}
        <RevenueEntryPanel />
      </div>
    );
  }

  if (view === 'import') {
    return (
      <div className="space-y-4">
        {nav}
        <LeaderboardImportPanel />
      </div>
    );
  }

  if (view === 'fiber') {
    return (
      <div className="space-y-4">
        {nav}
        <FiberInstallsPanel />
      </div>
    );
  }

  if (view === 'ranks') {
    return (
      <div className="space-y-4">
        {nav}
        <RanksStacksPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nav}

      <div className={cn(CARD, 'p-4')}>
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Rep money</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Set each rep's pay scale, season numbers, and housing. Reps only see their own row.
        </p>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reps..."
            className="pl-9 bg-background/50 border-white/[0.08]"
          />
        </div>
      </div>

      {loading ? (
        <LoadingList rows={6} />
      ) : (
        <div className={cn(CARD, 'divide-y divide-white/[0.05] overflow-hidden')}>
          {filtered.map(rep => {
            const c = commissions.get(rep.user_id);
            const h = housings.get(rep.user_id);
            const scale = (['rookie', 'veteran', 'marketing'].includes(c?.pay_scale) ? c.pay_scale : 'rookie') as PayScale;
            const revenue =
              c?.active_revenue ?? (c?.avg_account_value ? (c.signs ?? 0) * c.avg_account_value : null);
            const rate = c?.rate_override ?? (revenue !== null ? getRate(scale, revenue) : null);
            const isOpen = selected === rep.user_id;

            return (
              <div key={rep.user_id}>
                <button
                  onClick={() => openRep(rep.user_id)}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rep.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{teamName(rep.team_id)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="text-muted-foreground hidden sm:inline">{PAY_SCALE_LABELS[scale]}</span>
                      <span className={cn('font-semibold tabular-nums', rate !== null ? 'text-primary' : 'text-muted-foreground')}>
                        {rate !== null ? formatRate(Number(rate)) : 'not set'}
                      </span>
                      <span className={cn('tabular-nums', h?.monthly_cost != null ? 'text-foreground' : 'text-muted-foreground')}>
                        {h?.monthly_cost != null ? `${formatCurrency(Number(h.monthly_cost))}/mo` : 'no housing'}
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 pt-1 bg-background/30 space-y-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3" /> Commission
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Pay scale">
                          <select
                            value={draft.pay_scale}
                            onChange={e => setDraft(d => ({ ...d, pay_scale: e.target.value as PayScale }))}
                            className="w-full rounded-lg bg-background/60 border border-white/[0.08] px-3 py-2 text-sm text-foreground"
                          >
                            <option value="rookie">Rookie</option>
                            <option value="veteran">Veteran</option>
                            <option value="marketing">Marketing deal</option>
                          </select>
                        </Field>
                        <Field label="Signs this season">
                          <Input
                            value={draft.signs}
                            onChange={e => setDraft(d => ({ ...d, signs: e.target.value }))}
                            placeholder="0"
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <Field label="Average account value ($)">
                          <Input
                            value={draft.avg_account_value}
                            onChange={e => setDraft(d => ({ ...d, avg_account_value: e.target.value }))}
                            placeholder="e.g. 550"
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <Field label="Active revenue ($, optional)">
                          <Input
                            value={draft.active_revenue}
                            onChange={e => setDraft(d => ({ ...d, active_revenue: e.target.value }))}
                            placeholder="signs × avg if blank"
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <Field label="Rate override (%, optional)">
                          <Input
                            value={draft.rate_override}
                            onChange={e => setDraft(d => ({ ...d, rate_override: e.target.value }))}
                            placeholder="blank = use pay scale"
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <Field label="Commission notes">
                          <Input
                            value={draft.commission_notes}
                            onChange={e => setDraft(d => ({ ...d, commission_notes: e.target.value }))}
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                      </div>
                      {(() => {
                        const rev = num(draft.active_revenue) ?? (num(draft.avg_account_value) !== null ? (num(draft.signs) ?? 0) * num(draft.avg_account_value)! : null);
                        if (rev === null) return null;
                        const tier = getTier(draft.pay_scale, rev);
                        const pct = num(draft.rate_override);
                        const effRate = pct !== null ? pct / 100 : tier.rate;
                        return (
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatCurrency(rev)} revenue → bracket {formatTierRange(tier)} → {formatRate(effRate)} ={' '}
                            <span className="text-foreground font-semibold">{formatCurrency(rev * effRate)}</span>
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Home className="w-3 h-3" /> Housing
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Monthly cost ($)">
                          <Input
                            value={draft.monthly_cost}
                            onChange={e => setDraft(d => ({ ...d, monthly_cost: e.target.value }))}
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <Field label="Location">
                          <Input
                            value={draft.location}
                            onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                            className="bg-background/60 border-white/[0.08]"
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="Housing notes">
                            <textarea
                              value={draft.housing_notes}
                              onChange={e => setDraft(d => ({ ...d, housing_notes: e.target.value }))}
                              rows={2}
                              className="w-full rounded-lg bg-background/60 border border-white/[0.08] px-3 py-2 text-sm text-foreground resize-none"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => save(rep.user_id)} disabled={saving} size="sm" className="gap-1.5 rounded-xl">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No reps found</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
