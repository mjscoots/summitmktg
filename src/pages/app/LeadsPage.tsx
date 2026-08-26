import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Phone, RefreshCw, Users, Inbox, Database, PhoneCall, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { isStaffTier, tierOf } from '@/lib/tiers';
import {
  LEAD_STAGES,
  leadActions,
  telHref,
  useLeadsList,
  type LeadRow,
  type LeadScope,
} from '@/hooks/useLeads';
import LeadDrawer from '@/components/leads/LeadDrawer';
import CallMode from '@/components/leads/CallMode';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';
const NOT_ON_ROSTER = 'not-on-2026-roster';

type Chip = 'all' | 'designated' | 'free' | 'not_on_roster' | 'josh' | 'out_for_good';

const CHIPS: { id: Chip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'designated', label: 'Designated' },
  { id: 'free', label: 'Free' },
  { id: 'not_on_roster', label: 'Not on 2026 roster' },
  { id: 'josh', label: "Josh's system" },
  { id: 'out_for_good', label: 'Out for good' },
];

function callbackLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `Call back ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function LeadsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const tier = tierOf(role);
  const staff = isStaffTier(tier);
  const [params, setParams] = useSearchParams();
  const scope = ((params.get('tab') as LeadScope) || 'mine') as LeadScope;
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('all');
  const [hasPhone, setHasPhone] = useState<string>('all');
  const [chip, setChip] = useState<Chip>('all');
  const [openLead, setOpenLead] = useState<string | null>(params.get('lead'));
  const [callMode, setCallMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [managers, setManagers] = useState<
    { user_id: string; full_name: string | null; designated_count: number; has_access: boolean }[]
  >([]);
  const [assignTo, setAssignTo] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const { rows, loading, reload } = useLeadsList(
    scope,
    {
      search: search.trim() || null,
      stage: stage === 'all' ? null : stage,
      hasPhone: hasPhone === 'all' ? null : hasPhone === 'yes',
      designation: chip === 'designated' || chip === 'free' ? chip : null,
      tag: chip === 'not_on_roster' ? NOT_ON_ROSTER : null,
      system: chip === 'josh' ? 'Josh' : null,
      limit: scope === 'all' ? 600 : 300,
    },
    tier !== 'sales'
  );

  useEffect(() => {
    if (!staff) return;
    (supabase.rpc as any)('leads_manager_options').then(({ data }: { data: unknown }) => {
      setManagers((data as typeof managers) || []);
    });
  }, [staff]);

  const visible = useMemo(
    () => (chip === 'out_for_good' ? rows.filter((r) => !(r.tags || []).includes(NOT_ON_ROSTER)) : rows),
    [rows, chip]
  );

  const callable = useMemo(() => visible.filter((r) => !!r.phone && !r.do_not_call), [visible]);

  if (authLoading) return null;
  if (tier === 'sales') return <Navigate to="/app" replace />;

  const tabs: { id: LeadScope; label: string; icon: typeof Users }[] = [
    { id: 'mine', label: 'My leads', icon: Users },
    { id: 'free', label: 'Free pool', icon: Inbox },
    ...(staff ? [{ id: 'all' as LeadScope, label: 'All leads', icon: Database }] : []),
  ];

  const claim = async (lead: LeadRow) => {
    const { error } = await leadActions.claim(lead.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${lead.full_name} is yours`);
      reload();
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const designateOne = async (leadId: string, to: string) => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)('leads_designate_bulk', {
      _leads: [leadId],
      _to: to === 'free' ? null : to,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(to === 'free' ? 'Moved to the free pool' : 'Designated');
      reload();
    }
  };

  const designateSelected = async () => {
    if (selected.size === 0 || !assignTo) return;
    setBusy(true);
    const { error } = await (supabase.rpc as any)('leads_designate_bulk', {
      _leads: Array.from(selected),
      _to: assignTo === 'free' ? null : assignTo,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(
        assignTo === 'free'
          ? `${selected.size} moved to the free pool`
          : `${selected.size} designated`
      );
      setSelected(new Set());
      reload();
    }
  };

  return (
    <AppLayout>
      <div className="h-full">
        <main className="mx-auto max-w-5xl px-4 py-6">
          <PageBackButton to="/app" label="Home" />

          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Leads</h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                People who are out and not coming back. {visible.length} shown.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setCallMode(true)}
                disabled={callable.length === 0}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                <PhoneCall className="h-4 w-4" /> Call mode
                <span className="tabular-nums opacity-80">{callable.length}</span>
              </button>
              <button
                onClick={reload}
                className="micro-label inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
          </div>

          <div className={cn('mb-4 grid gap-2', staff ? 'grid-cols-3' : 'grid-cols-2')}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setParams({ tab: t.id });
                  setSelected(new Set());
                  setChip('all');
                }}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-bold transition-colors sm:text-[13px]',
                  scope === t.id
                    ? 'border-primary/40 bg-primary text-primary-foreground'
                    : 'border-border/50 bg-surface text-muted-foreground hover:text-foreground'
                )}
              >
                <t.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {staff && scope === 'all' && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChip(c.id)}
                  className={cn(
                    'min-h-9 rounded-full border px-3 text-[12px] font-medium transition-colors',
                    chip === c.id
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
              className="h-10 text-[13px]"
            />
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-10 text-[13px] sm:w-[170px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">All stages</SelectItem>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[13px]">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hasPhone} onValueChange={setHasPhone}>
              <SelectTrigger className="h-10 text-[13px] sm:w-[150px]">
                <SelectValue placeholder="Phone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">Phone: any</SelectItem>
                <SelectItem value="yes" className="text-[13px]">Has phone</SelectItem>
                <SelectItem value="no" className="text-[13px]">No phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {staff && scope === 'all' && selected.size > 0 && (
            <div className={cn(CARD, 'mb-3 flex flex-wrap items-center gap-2 p-3')}>
              <p className="text-[13px] font-semibold text-foreground tabular-nums">
                {selected.size} selected
              </p>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="h-10 flex-1 text-[13px] sm:w-[230px] sm:flex-none">
                  <SelectValue placeholder="Designate to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free" className="text-[13px]">Free pool (no owner)</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                      {m.full_name || 'Unnamed'}
                      {!m.has_access ? ' · no access' : ''} · {m.designated_count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={designateSelected}
                disabled={busy || !assignTo}
                className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="min-h-10 rounded-xl border border-border/60 px-3 text-[13px] text-muted-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-[var(--radius)]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className={cn(CARD, 'p-10 text-center')}>
              <p className="text-sm text-muted-foreground">
                {scope === 'mine' ? 'No leads are designated to you yet.' : 'No leads match these filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((lead) => {
                const notOnRoster = (lead.tags || []).includes(NOT_ON_ROSTER);
                const line = [
                  lead.former_manager_name ? `Was with ${lead.former_manager_name}` : null,
                  lead.last_outcome ? lead.last_outcome.replace(/_/g, ' ') : lead.stage?.replace('_', ' '),
                  callbackLabel(lead.next_call_at),
                  scope === 'all' ? lead.designated_to_name || 'Free' : null,
                  lead.designated_to
                    ? lead.hold
                      ? 'On hold'
                      : lead.cycles_in_days != null
                        ? `Cycles in ${lead.cycles_in_days} day${lead.cycles_in_days === 1 ? '' : 's'}`
                        : null
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div key={lead.id} className={cn(CARD, 'flex items-center gap-3 p-3')}>
                    {staff && scope === 'all' && (
                      <button
                        onClick={() => toggle(lead.id)}
                        aria-label={selected.has(lead.id) ? `Deselect ${lead.full_name}` : `Select ${lead.full_name}`}
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                          selected.has(lead.id)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/70'
                        )}
                      >
                        {selected.has(lead.id) && <Check className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button onClick={() => setOpenLead(lead.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {lead.full_name}
                        {notOnRoster && (
                          <span className="ml-2 rounded-full border border-border/60 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Not on 2026 roster
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{line || 'No history yet'}</p>
                    </button>
                    {staff && scope === 'all' && (
                      <Select
                        value={lead.designated_to || 'free'}
                        onValueChange={(v) => designateOne(lead.id, v)}
                        disabled={busy}
                      >
                        <SelectTrigger
                          aria-label={`Designate ${lead.full_name}`}
                          className="h-9 w-[150px] shrink-0 text-[12px]"
                        >
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free" className="text-[13px]">Free pool</SelectItem>
                          {managers.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                              {m.full_name || 'Unnamed'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {telHref(lead.phone) && (
                      <a
                        href={telHref(lead.phone) as string}
                        aria-label={`Call ${lead.full_name}`}
                        className="shrink-0 rounded-lg border border-primary/25 bg-primary/10 p-2.5 text-primary"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {lead.designation_status === 'free' && scope !== 'all' && (
                      <button
                        onClick={() => claim(lead)}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <LeadDrawer leadId={openLead} tier={tier} onClose={() => setOpenLead(null)} onChanged={reload} />
          <CallMode open={callMode} leads={callable} onClose={() => setCallMode(false)} onDone={reload} />
        </main>
      </div>
    </AppLayout>
  );
}
