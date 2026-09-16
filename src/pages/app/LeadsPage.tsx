import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, RefreshCw, Users, Inbox, Database, PhoneCall, Check, Undo2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  money,
  telHref,
  useLeadsList,
  type LeadRow,
  type LeadScope,
} from '@/hooks/useLeads';
import {
  byRankThenColdest,
  posTagOf,
  rankOf,
  statusTagOf,
  tagLabel,
  RANK_PREFIX,
  STATUS_PREFIX,
} from '@/lib/leadTags';
import LeadDrawer from '@/components/leads/LeadDrawer';
import ThisWeekQueue, { buildWeekQueue } from '@/components/leads/ThisWeekQueue';
import CallMode from '@/components/leads/CallMode';
import ReSignScriptsSheet, { ScriptsButton } from '@/components/leads/ReSignScriptsSheet';
import OwnerAssignQueue from '@/components/leads/OwnerAssignQueue';


import { PageHeader } from '@/components/layout/PageHeader';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';

type Chip = 'out' | 'not_on_roster' | 'all' | 'designated' | 'free';

const CHIPS: { id: Chip; label: string }[] = [
  { id: 'out', label: 'Out this season' },
  { id: 'not_on_roster', label: 'Older pool' },
  { id: 'all', label: 'All' },
  { id: 'designated', label: 'Designated' },
  { id: 'free', label: 'Pool' },
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
  const rawScope = ((params.get('tab') as LeadScope) || 'mine') as LeadScope;
  const scope: LeadScope = tier === 'sales' ? 'mine' : rawScope;
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('all');
  const [hasPhone, setHasPhone] = useState<string>('all');
  const [system, setSystem] = useState<string>('all');
  // The whole board by default: the season-out filter hid every newly imported lead.
  const [chip, setChip] = useState<Chip>('all');
  const [openLead, setOpenLead] = useState<string | null>(params.get('lead'));
  const [callMode, setCallMode] = useState(false);
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [managers, setManagers] = useState<
    { user_id: string; full_name: string | null; designated_count: number; has_access: boolean }[]
  >([]);
  const [assignTo, setAssignTo] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastAssign, setLastAssign] = useState<{
    ids: string[];
    requested: number;
    changed: number;
    name: string;
    undone: boolean;
  } | null>(null);
  const [rankTag, setRankTag] = useState<string>('all');
  const [statusTag, setStatusTag] = useState<string>('all');
  const [sort, setSort] = useState<'rank' | 'revenue'>('rank');
  const [tagOptions, setTagOptions] = useState<{ tag: string; count: number }[]>([]);
  const [leadTotal, setLeadTotal] = useState<number | null>(null);

  // leads_list takes a single _tag, so one tag goes to the query and any second
  // one is applied to the returned rows.
  const serverTag = rankTag !== 'all' ? rankTag : statusTag !== 'all' ? statusTag : null;
  const clientTag = rankTag !== 'all' && statusTag !== 'all' ? statusTag : null;

  const { rows, loading, reload } = useLeadsList(
    scope,
    {
      search: search.trim() || null,
      stage: stage === 'all' ? null : stage,
      hasPhone: hasPhone === 'all' ? null : hasPhone === 'yes',
      designation: scope === 'all' && (chip === 'designated' || chip === 'free') ? chip : null,
      rosterStatus:
        scope === 'all' && (chip === 'out' || chip === 'not_on_roster') ? chip : null,
      system: system === 'all' ? null : system,
      tag: serverTag,
      limit: scope === 'all' ? 600 : 300,
    },
    true
  );

  // A selection that outlives its filter assigns the wrong people. Clear it
  // whenever any filter input changes.
  useEffect(() => {
    setSelected(new Set());
  }, [scope, search, stage, hasPhone, system, chip, rankTag, statusTag]);

  useEffect(() => {
    if (tier === 'sales') return;
    (supabase.rpc as any)('lead_tag_options').then(({ data }: { data: unknown }) => {
      const d = (data || {}) as { total?: number; tags?: { tag: string; count: number }[] };
      setTagOptions(d.tags || []);
      setLeadTotal(d.total ?? null);
    });
  }, [tier]);

  const rankOptions = useMemo(
    () => tagOptions.filter((t) => t.tag.startsWith(RANK_PREFIX)),
    [tagOptions]
  );
  const statusOptions = useMemo(
    () => tagOptions.filter((t) => t.tag.startsWith(STATUS_PREFIX)),
    [tagOptions]
  );

  const [counts, setCounts] = useState<{
    out: number;
    pool: number;
    designated: number;
    signed_2027: number;
    signed_count: number;
    roster_total: number;
    signed_revenue: number;
    unsigned_count: number;
    unsigned_revenue: number;
  } | null>(null);


  useEffect(() => {
    if (!staff) return;
    (supabase.rpc as any)('leads_counts').then(({ data }: { data: unknown }) => {
      if (data) setCounts(data as typeof counts);
    });
  }, [staff]);

  // True open recruiting pool, so the owner sees the whole board, not just their own list.
  const isTop = role === 'owner' || role === 'admin';
  const [recruitPool, setRecruitPool] = useState<number | null>(null);
  useEffect(() => {
    if (!isTop) return;
    (supabase as any)
      .from('recruiting_leads')
      .select('id', { count: 'exact', head: true })
      .then(({ count }: { count: number | null }) => setRecruitPool(count ?? null));
  }, [isTop]);


  useEffect(() => {
    if (!staff) return;
    (supabase.rpc as any)('leads_manager_options').then(({ data }: { data: unknown }) => {
      setManagers((data as typeof managers) || []);
    });
  }, [staff]);

  const visible = useMemo(() => {
    let base = clientTag ? rows.filter((r) => (r.tags || []).includes(clientTag)) : rows;
    // No hire stays hidden everywhere unless it is asked for by name.
    if (stage === 'all') base = base.filter((r) => r.stage !== 'excluded');
    return sort === 'rank' ? [...base].sort(byRankThenColdest) : base;
  }, [rows, clientTag, sort, stage]);

  // Call mode works the exact list the This week section shows, so the two counts agree.
  const callable = useMemo(
    () => buildWeekQueue(visible).filter((r) => !!r.phone && !r.do_not_call),
    [visible]
  );


  if (authLoading) return null;

  const tabs: { id: LeadScope; label: string; icon: typeof Users }[] =
    tier === 'sales'
      ? [{ id: 'mine', label: 'My leads', icon: Users }]
      : [
          { id: 'mine', label: 'My leads', icon: Users },
          { id: 'free', label: 'Pool', icon: Inbox },
          ...(staff ? [{ id: 'all' as LeadScope, label: 'Call board', icon: Database }] : []),
        ];

  const claim = async (lead: LeadRow) => {
    const { error } = await leadActions.claim(lead.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${lead.full_name} is yours`);
      reload();
    }
  };

  const decline = async (lead: LeadRow) => {
    const { error } = await leadActions.decline(lead.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${lead.full_name} moved to the pool`);
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

  const assignTarget = managers.find((m) => m.user_id === assignTo);
  const assignTargetName =
    assignTo === 'free' ? 'the free pool (no owner)' : assignTarget?.full_name || 'Unnamed';

  const designateSelected = async () => {
    if (selected.size === 0 || !assignTo) return;
    const ids = Array.from(selected);
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('leads_designate_bulk', {
      _leads: ids,
      _to: assignTo === 'free' ? null : assignTo,
    });
    setBusy(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const changed = Number(data ?? 0);
    setLastAssign({ ids, requested: ids.length, changed, name: assignTargetName, undone: false });
    toast.success(`${changed} assigned to ${assignTargetName}`);
    setSelected(new Set());
    reload();
  };

  const undoLastAssign = async () => {
    if (!lastAssign || lastAssign.undone) return;
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('leads_designate_bulk', {
      _leads: lastAssign.ids,
      _to: null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const changed = Number(data ?? 0);
    setLastAssign({ ...lastAssign, undone: true, changed });
    toast.success(`${changed} put back in the pool`);
    reload();
  };

  return (
    <AppLayout>
      <div className="h-full">
        <main className="mx-auto max-w-5xl px-4 py-6">
          <PageBackButton to="/app" label="Home" />

          <PageHeader
            title="Leads"
            context={`People who are out and not coming back. ${visible.length}${
              leadTotal != null ? ` of ${leadTotal}` : ''
            } shown.`}
            action={
              <>
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
              </>
            }
            className="mb-5"
          />

          {isTop && recruitPool !== null && recruitPool > 0 && (
            <p className="mb-4 text-[12px] text-muted-foreground">
              Recruiting pool:{' '}
              <span className="font-semibold tabular-nums text-foreground">{recruitPool}</span> open
              leads on the board.
            </p>
          )}



          <div
            className={cn(
              'mb-4 grid gap-2',
              tabs.length === 1 ? 'grid-cols-1' : staff ? 'grid-cols-3' : 'grid-cols-2'
            )}
          >
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

          {staff && scope === 'all' && counts && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Out this season', value: counts.out },
                { label: 'Designated', value: counts.designated },
                { label: 'Pool', value: counts.pool },
                { label: 'Signed for 2027', value: counts.signed_2027 },
              ].map((c) => (
                <div
                  key={c.label}
                  className={cn(CARD, 'px-3 py-2', c.label === 'Signed for 2027' && 'celebrate-card')}
                >
                  <p
                    className="stat-num text-lg font-bold tabular-nums"
                    style={
                      c.label === 'Signed for 2027'
                        ? { color: 'hsl(var(--workspace-accent))' }
                        : undefined
                    }
                  >
                    {c.value}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {staff && scope === 'all' && counts && (
            <p className="mb-3 text-[12px] leading-snug text-muted-foreground">
              Signed for 2027:{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'hsl(var(--workspace-accent))' }}>
                {counts.signed_count} of {counts.roster_total}
              </span>{' '}
              · {money(counts.signed_revenue)} last season. Not signed:{' '}
              {counts.unsigned_count} · {money(counts.unsigned_revenue)} last season. Historical names are
              not counted.
            </p>
          )}


          {tier !== 'sales' && scope === 'mine' && !loading && (
            <>
              <div className="mb-3">
                <ScriptsButton onClick={() => setScriptsOpen(true)} />
              </div>
              <ThisWeekQueue rows={rows} onOpen={setOpenLead} />
            </>
          )}

          {staff && scope === 'all' && (
            <OwnerAssignQueue managers={managers} onChanged={reload} />
          )}


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
              <SelectTrigger className="h-10 text-[13px] sm:w-[150px]" aria-label="Phone">
                <SelectValue placeholder="Phone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">Phone: any</SelectItem>
                <SelectItem value="yes" className="text-[13px]">Has phone</SelectItem>
                <SelectItem value="no" className="text-[13px]">No phone</SelectItem>
              </SelectContent>
            </Select>
            {staff && (
              <Select value={system} onValueChange={setSystem}>
                <SelectTrigger className="h-10 text-[13px] sm:w-[150px]">
                  <SelectValue placeholder="System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[13px]">Both systems</SelectItem>
                  <SelectItem value="Summit" className="text-[13px]">Trinity</SelectItem>
                  <SelectItem value="Josh" className="text-[13px]">Josh</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {tier !== 'sales' && (
            <div data-testid="lead-filter-row" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Select
                value={rankTag}
                onValueChange={(v) => {
                  setRankTag(v);
                  if (v !== 'all') setChip('all');
                }}
              >
                <SelectTrigger className="h-10 min-w-0 text-[13px]" aria-label="Rank">
                  <SelectValue placeholder="Rank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[13px]">Rank: any</SelectItem>
                  {rankOptions.map((o) => (
                    <SelectItem key={o.tag} value={o.tag} className="text-[13px]">
                      Rank {tagLabel(o.tag)} · {o.count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusTag}
                onValueChange={(v) => {
                  setStatusTag(v);
                  if (v !== 'all') setChip('all');
                }}
              >
                <SelectTrigger className="h-10 min-w-0 text-[13px]" aria-label="Status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[13px]">Status: any</SelectItem>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.tag} value={o.tag} className="text-[13px]">
                      {tagLabel(o.tag)} · {o.count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as 'rank' | 'revenue')}>
                <SelectTrigger className="col-span-2 h-10 min-w-0 text-[13px] sm:col-span-1" aria-label="Sort">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank" className="text-[13px]">Sort: rank, coldest first</SelectItem>
                  <SelectItem value="revenue" className="text-[13px]">Sort: last season revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}


          {staff && scope === 'all' && visible.length > 0 && (
            <div className={cn(CARD, 'mb-3 flex flex-wrap items-center gap-2 p-3')}>
              <button
                data-testid="lead-select-all"
                onClick={() =>
                  setSelected((prev) =>
                    prev.size === visible.length ? new Set() : new Set(visible.map((r) => r.id))
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/60 px-3 text-[13px] font-semibold text-foreground"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border',
                    selected.size === visible.length && selected.size > 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70'
                  )}
                >
                  {selected.size === visible.length && selected.size > 0 && (
                    <Check className="h-3 w-3" />
                  )}
                </span>
                {selected.size === visible.length && selected.size > 0
                  ? 'Clear all'
                  : `Select all ${visible.length} these filters match`}
              </button>
              <p className="min-w-0 text-[13px] text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{selected.size}</span> selected
              </p>
            </div>
          )}

          {staff && scope === 'all' && selected.size > 0 && (
            <div className={cn(CARD, 'mb-3 flex flex-wrap items-center gap-2 p-3')}>
              <p className="text-[13px] font-semibold text-foreground tabular-nums">
                {selected.size} selected
              </p>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="h-10 min-w-0 flex-1 text-[13px] sm:w-[230px] sm:flex-none">
                  <SelectValue placeholder="Assign to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free" className="text-[13px]">Free pool (no owner)</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                      {m.full_name || 'Unnamed'}
                      {!m.has_access ? ' · no access' : ''} · has {m.designated_count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={busy || !assignTo}
                className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="min-h-10 rounded-xl border border-border/60 px-3 text-[13px] text-muted-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {staff && lastAssign && (
            <div className={cn(CARD, 'mb-3 flex flex-wrap items-center gap-2 p-3')}>
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">
                {lastAssign.undone ? (
                  <>Undone. {lastAssign.changed} leads are back in the pool with no owner.</>
                ) : lastAssign.changed === lastAssign.requested ? (
                  <>
                    <span className="font-semibold tabular-nums">{lastAssign.changed}</span> leads
                    assigned to {lastAssign.name}.
                  </>
                ) : (
                  <>
                    <span className="font-semibold tabular-nums">{lastAssign.changed}</span> leads
                    were assigned to {lastAssign.name}, but{' '}
                    <span className="font-semibold tabular-nums">{lastAssign.requested}</span> were
                    selected. The difference was left out because those rows are not in the lead
                    pool.
                  </>
                )}
              </p>
              {!lastAssign.undone && (
                <button
                  onClick={undoLastAssign}
                  disabled={busy}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border/60 px-3 text-[13px] font-semibold text-foreground disabled:opacity-50"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo this assignment
                </button>
              )}
              <button
                onClick={() => setLastAssign(null)}
                className="min-h-10 shrink-0 rounded-xl px-2 text-[13px] text-muted-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Assign {selected.size} lead{selected.size === 1 ? '' : 's'} to {assignTargetName}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {assignTo === 'free'
                    ? `These ${selected.size} people will have no owner and go back on the open board.`
                    : `${assignTargetName} becomes the owner of these ${selected.size} people and will see them on their own list. You can undo this straight after.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={designateSelected} disabled={busy}>
                  Yes, assign {selected.size}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                const line = [
                  lead.team_name,
                  lead.former_manager_name ? `Was with ${lead.former_manager_name}` : null,
                  lead.season_revenue != null ? money(lead.season_revenue) : null,
                  lead.last_contact_at
                    ? `Last contact ${new Date(lead.last_contact_at).toLocaleDateString()}`
                    : null,
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
                        {lead.signed_2027 && (
                          <span className="chip-warm ml-2 align-middle text-[10px]">
                            Signed for 2027
                          </span>
                        )}

                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{line || 'No history yet'}</p>
                      {(() => {
                        const chips = [
                          rankOf(lead.tags) ? `rank-${rankOf(lead.tags)!.toLowerCase()}` : null,
                          statusTagOf(lead.tags),
                          posTagOf(lead.tags),
                        ].filter(Boolean) as string[];
                        if (chips.length === 0) return null;
                        return (
                          <span data-testid="lead-chips" className="mt-1 flex min-w-0 flex-wrap gap-1">
                            {chips.map((t) => (
                              <span
                                key={t}
                                className="max-w-full truncate rounded-full border border-border/60 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                {tagLabel(t)}
                              </span>
                            ))}
                          </span>
                        );
                      })()}
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
                    {!lead.designated_to && scope !== 'all' && (
                      <button
                        onClick={() => claim(lead)}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground"
                      >
                        Claim
                      </button>
                    )}
                    {lead.designated_to && scope === 'mine' && (
                      <button
                        onClick={() => decline(lead)}
                        className="min-h-11 shrink-0 rounded-lg border border-border/60 px-3 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Decline
                      </button>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          <LeadDrawer leadId={openLead} tier={tier} onClose={() => setOpenLead(null)} onChanged={reload} />
          <ReSignScriptsSheet open={scriptsOpen} onClose={() => setScriptsOpen(false)} />
          <CallMode open={callMode} leads={callable} onClose={() => setCallMode(false)} onDone={reload} />
        </main>
      </div>
    </AppLayout>
  );
}
