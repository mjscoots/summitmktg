import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Phone, RefreshCw, Users, Inbox, Database, PhoneCall } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageBackButton from '@/components/layout/PageBackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import LeadDrawer from '@/components/leads/LeadDrawer';
import CallMode from '@/components/leads/CallMode';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';

export default function LeadsPage() {
  const { role, loading: authLoading } = useAuth();
  const tier = tierOf(role);
  const staff = isStaffTier(tier);
  const [params, setParams] = useSearchParams();
  const scope = ((params.get('tab') as LeadScope) || 'mine') as LeadScope;
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('all');
  const [hasPhone, setHasPhone] = useState<string>('all');
  const [openLead, setOpenLead] = useState<string | null>(params.get('lead'));
  const [callMode, setCallMode] = useState(false);

  const { rows, loading, reload } = useLeadsList(
    scope,
    {
      search: search.trim() || null,
      stage: stage === 'all' ? null : stage,
      hasPhone: hasPhone === 'all' ? null : hasPhone === 'yes',
      limit: scope === 'all' ? 400 : 200,
    },
    tier !== 'sales'
  );

  const callable = useMemo(() => rows.filter((r) => !!r.phone && !r.do_not_call), [rows]);

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

  return (
    <AppLayout>
      <div className="h-full">
        <main className="mx-auto max-w-5xl px-4 py-6">
          <PageBackButton to="/app" label="Home" />

          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Leads</h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Every person who has been part of Summit. {rows.length} shown.
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
                onClick={() => setParams({ tab: t.id })}
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

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-[var(--radius)]" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className={cn(CARD, 'p-10 text-center')}>
              <p className="text-sm text-muted-foreground">
                {scope === 'mine' ? 'No leads are designated to you yet.' : 'No leads match these filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((lead) => (
                <div key={lead.id} className={cn(CARD, 'flex items-center gap-3 p-3')}>
                  <button onClick={() => setOpenLead(lead.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[14px] font-semibold text-foreground">{lead.full_name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {[
                        lead.stage?.replace('_', ' '),
                        lead.system,
                        lead.former_manager_name,
                        money(lead.season_revenue),
                        lead.designated_to_name || 'Free',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </button>
                  {telHref(lead.phone) && (
                    <a
                      href={telHref(lead.phone) as string}
                      aria-label={`Call ${lead.full_name}`}
                      className="shrink-0 rounded-lg border border-primary/25 bg-primary/10 p-2.5 text-primary"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {lead.designation_status === 'free' && (
                    <button
                      onClick={() => claim(lead)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground"
                    >
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <LeadDrawer leadId={openLead} tier={tier} onClose={() => setOpenLead(null)} onChanged={reload} />
          <CallMode open={callMode} leads={callable} onClose={() => setCallMode(false)} onDone={reload} />
        </main>
      </div>
    </AppLayout>
  );
}
