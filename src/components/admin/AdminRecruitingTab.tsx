import { LoadingList } from '@/components/shared/LoadingList';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, Trash2, Plus, RefreshCw, Ticket, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PROOF_FIELDS } from '@/components/recruiting/RecruitingProof';
import AdminRecruitingContent from '@/components/admin/AdminRecruitingContent';
import AdminSourcePanel from '@/components/admin/AdminSourcePanel';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUSES = ['New', 'Claimed', 'Contacted', 'Booked', 'Signed', 'Dead'] as const;

const STATUS_STYLE: Record<string, string> = {
  New: 'bg-muted/40 text-muted-foreground border-border/50',
  Claimed: 'bg-primary/15 text-primary border-primary/30',
  Contacted: 'bg-primary/15 text-primary border-primary/30',
  Booked: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Signed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Dead: 'bg-red-500/15 text-red-400 border-red-500/30',
  Winback: 'bg-muted/40 text-muted-foreground border-border/50',
  'Winback Claimed': 'bg-primary/15 text-primary border-primary/30',
  Returning: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

interface Lead {
  id: string;
  first_name: string;
  phone: string | null;
  city: string | null;
  interest_reason: string | null;
  ref_code: string | null;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  last_activity_at: string | null;
  notes: string | null;
  created_at: string;
}

interface RefCode {
  id: string;
  code: string;
  label: string | null;
  assigned_user_id: string | null;
  created_at: string;
}

interface RepOption { user_id: string; full_name: string }

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

export default function AdminRecruitingTab({ reps }: { reps: RepOption[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [refCodes, setRefCodes] = useState<RefCode[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [codeBoard, setCodeBoard] = useState<{ ref_code: string; leads: number; signed: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [refFilter, setRefFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(50);

  const [newCode, setNewCode] = useState('');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [newCodeUser, setNewCodeUser] = useState('none');
  const [calendly, setCalendly] = useState('');
  const [proof, setProof] = useState<Record<string, string>>({});
  const [savingProof, setSavingProof] = useState(false);
  const [savingCalendly, setSavingCalendly] = useState(false);

  const repName = useCallback(
    (id: string | null) => (id ? reps.find((r) => r.user_id === id)?.full_name || 'Unknown' : '—'),
    [reps]
  );

  const load = useCallback(async () => {
    const [leadsRes, codesRes, funnelRes, boardRes, settingsRes, proofRes] = await Promise.all([
      (supabase as any).from('recruiting_leads').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('recruiting_ref_codes').select('*').order('code'),
      (supabase as any).rpc('get_recruiting_funnel'),
      (supabase as any).rpc('get_ref_code_leaderboard'),
      supabase.from('app_settings').select('key, value').eq('key', 'recruiting_calendly_url').maybeSingle(),
      supabase.from('app_settings').select('key, value').like('key', 'recruiting_proof_%'),
    ]);
    setLeads((leadsRes.data as Lead[]) || []);
    setRefCodes((codesRes.data as RefCode[]) || []);
    setFunnel(funnelRes.data || null);
    setCodeBoard((boardRes.data as any[]) || []);
    setCalendly(settingsRes.data?.value || 'https://calendly.com/REPLACE-ME');
    const proofMap: Record<string, string> = {};
    ((proofRes.data as { key: string; value: string }[]) || []).forEach((row) => {
      proofMap[row.key.replace('recruiting_proof_', '')] = row.value || '';
    });
    setProof(proofMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sourceOf = (l: Lead) =>
    l.ref_code === 'winback'
      ? 'winback'
      : l.ref_code === 'pipeline-import'
        ? 'pipeline-import'
        : l.ref_code === 'manual'
          ? 'manual'
          : 'ticket';

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (statusFilter === 'all' || l.status === statusFilter) &&
          (refFilter === 'all' || (l.ref_code || 'none') === refFilter) &&
          (repFilter === 'all' || (l.claimed_by || 'none') === repFilter) &&
          (sourceFilter === 'all' || sourceOf(l) === sourceFilter)
      ),
    [leads, statusFilter, refFilter, repFilter, sourceFilter]
  );

  const signedLeads = useMemo(() => leads.filter((l) => l.status === 'Signed'), [leads]);

  const assign = async (leadId: string, userId: string | null) => {
    const { data, error } = await (supabase as any).rpc('admin_assign_lead', {
      _lead_id: leadId,
      _user_id: userId,
    });
    if (error || !data?.success) { toast.error('Update failed'); return; }
    toast.success(userId ? 'Lead reassigned' : 'Lead released to the board');
    load();
  };

  const setStatus = async (leadId: string, status: string) => {
    const { error } = await (supabase as any)
      .from('recruiting_leads')
      .update({ status, last_activity_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) { toast.error('Update failed'); return; }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
  };

  const removeLead = async (leadId: string) => {
    const { error } = await (supabase as any).from('recruiting_leads').delete().eq('id', leadId);
    if (error) { toast.error('Delete failed'); return; }
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  };

  const createCode = async () => {
    const code = newCode.trim();
    if (!code) return;
    const { error } = await (supabase as any).from('recruiting_ref_codes').insert({
      code,
      label: newCodeLabel.trim() || null,
      assigned_user_id: newCodeUser === 'none' ? null : newCodeUser,
    });
    if (error) { toast.error('Could not create code'); return; }
    setNewCode(''); setNewCodeLabel(''); setNewCodeUser('none');
    toast.success('Ref code created');
    load();
  };

  const updateCodeUser = async (id: string, userId: string) => {
    const { error } = await (supabase as any)
      .from('recruiting_ref_codes')
      .update({ assigned_user_id: userId === 'none' ? null : userId })
      .eq('id', id);
    if (error) { toast.error('Update failed'); return; }
    setRefCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, assigned_user_id: userId === 'none' ? null : userId } : c))
    );
  };

  const deleteCode = async (id: string) => {
    await (supabase as any).from('recruiting_ref_codes').delete().eq('id', id);
    setRefCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const saveCalendly = async () => {
    setSavingCalendly(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'recruiting_calendly_url', value: calendly.trim() }, { onConflict: 'key' });
    setSavingCalendly(false);
    if (error) { toast.error('Could not save link'); return; }
    toast.success('Booking link saved');
  };

  const saveProof = async () => {
    setSavingProof(true);
    const rows = PROOF_FIELDS.map((f) => ({
      key: `recruiting_proof_${f.key}`,
      value: (proof[f.key] || '').trim(),
    }));
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    setSavingProof(false);
    if (error) { toast.error('Could not save proof numbers'); return; }
    toast.success('Proof section saved');
  };

  if (loading) {
    return (
      <LoadingList rows={5} className="py-6" />
    );
  }

  const pct = (n: number) => (funnel?.total ? `${Math.round((n / funnel.total) * 100)}%` : '0%');

  return (
    <div className="space-y-4">
      {/* Funnel cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Total leads', value: String(funnel?.total ?? 0) },
          { label: 'Claim %', value: pct(funnel?.claimed ?? 0) },
          { label: 'Contact %', value: pct(funnel?.contacted ?? 0) },
          { label: 'Booked %', value: pct(funnel?.booked ?? 0) },
          { label: 'Signed %', value: pct(funnel?.signed ?? 0) },
          { label: 'Avg to contact', value: `${funnel?.avg_hours_to_claim ?? 0}h` },
        ].map((c) => (
          <div key={c.label} className={cn(CARD, 'p-3')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="text-xl font-black text-foreground mt-1 stat-num">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={cn(CARD, 'p-3 flex flex-wrap items-center gap-2')}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={refFilter} onValueChange={setRefFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Ref code" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ref codes</SelectItem>
            <SelectItem value="none">No ref code</SelectItem>
            {Array.from(new Set(leads.map((l) => l.ref_code).filter(Boolean) as string[])).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Rep" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reps</SelectItem>
            <SelectItem value="none">Unclaimed</SelectItem>
            {reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="ticket">Golden Ticket (ref)</SelectItem>
            <SelectItem value="pipeline-import">Pipeline import</SelectItem>
            <SelectItem value="manual">Manually added</SelectItem>
            <SelectItem value="winback">Win-back</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Leads table */}
      <div className={cn(CARD, 'overflow-x-auto')}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">City</th>
              <th className="px-3 py-2 font-semibold">Reason</th>
              <th className="px-3 py-2 font-semibold">Ref</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Rep</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((l) => (
              <tr key={l.id} className="border-b border-white/[0.04]">
                <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{l.first_name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{l.phone || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{l.city || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{l.interest_reason || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-primary/80">{l.ref_code || '—'}</td>
                <td className="px-3 py-2">
                  <Select value={l.status} onValueChange={(v) => setStatus(l.id, v)}>
                    <SelectTrigger
                      className={cn('h-7 w-[120px] text-[11px] border', STATUS_STYLE[l.status], l.status === 'Signed' && 'signed-shimmer')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={l.claimed_by || 'none'}
                    onValueChange={(v) => assign(l.id, v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-[160px] text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Release to board</SelectItem>
                      {reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeLead(l.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                    aria-label={`Delete lead ${l.first_name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No leads match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > visibleCount && (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
            <span className="text-[11px] text-muted-foreground">
              Showing {visibleCount} of {filtered.length}
            </span>
            <button
              onClick={() => setVisibleCount((c) => c + 50)}
              className="min-h-9 rounded-lg border border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Load 50 more
            </button>
          </div>
        )}
      </div>

      <AdminSourcePanel />

      {/* Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cn(CARD, 'p-4')}>
          <h3 className="text-sm font-bold text-foreground mb-1">Attribution — signed leads</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Sourcer (ref code) and closer (rep) for 50/50 splits.</p>
          <div className="space-y-2">
            {signedLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                <span className="text-xs font-semibold text-foreground">{l.first_name}</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                    Sourcer: {l.ref_code || 'none'}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                    Closer: {repName(l.claimed_by)}
                  </span>
                </div>
              </div>
            ))}
            {signedLeads.length === 0 && <p className="text-xs text-muted-foreground">No signed leads yet.</p>}
          </div>
        </div>

        <div className={cn(CARD, 'p-4')}>
          <h3 className="text-sm font-bold text-foreground mb-3">Signs per ref code</h3>
          <div className="space-y-1.5">
            {codeBoard.map((c, i) => (
              <div key={c.ref_code} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
                <span className="w-5 text-center text-xs font-black text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-xs font-semibold text-foreground">{c.ref_code}</span>
                <span className="text-[11px] text-muted-foreground">{c.leads} leads</span>
                <span className="text-sm font-black text-emerald-400">{c.signed}</span>
              </div>
            ))}
            {codeBoard.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* Ref codes + booking link */}
      <div className={cn(CARD, 'p-4')}>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" /> Ref codes
        </h3>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. 047)" className="h-8 w-[140px] text-xs" />
          <Input value={newCodeLabel} onChange={(e) => setNewCodeLabel(e.target.value)} placeholder="Label (optional)" className="h-8 w-[180px] text-xs" />
          <Select value={newCodeUser} onValueChange={setNewCodeUser}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Assign to rep" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={createCode}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="space-y-1.5">
          {refCodes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
              <span className="text-xs font-bold text-foreground">{c.code}</span>
              {c.label && <span className="text-[11px] text-muted-foreground">{c.label}</span>}
              <span className="text-[11px] text-muted-foreground ml-auto truncate max-w-full">
                {window.location.origin}/ticket?ref={c.code}
              </span>
              <Select value={c.assigned_user_id || 'none'} onValueChange={(v) => updateCodeUser(c.id, v)}>
                <SelectTrigger className="h-7 w-[160px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button
                onClick={() => deleteCode(c.id)}
                className="text-muted-foreground hover:text-red-400"
                aria-label={`Delete ref code ${c.code}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {refCodes.length === 0 && <p className="text-xs text-muted-foreground">No ref codes yet.</p>}
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
            <BadgeCheck className="w-3.5 h-3.5 text-primary" /> Recruiting page proof numbers
          </h4>
          <p className="text-[11px] text-muted-foreground mb-3">
            Shown on the public /recruiting page. Blank fields are hidden — nothing is ever made up. Clear all fields
            to hide the strip entirely.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROOF_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="micro-label mb-1 block" htmlFor={`proof-${f.key}`}>{f.label}</label>
                <Input
                  id={`proof-${f.key}`}
                  value={proof[f.key] || ''}
                  onChange={(e) => setProof({ ...proof, [f.key]: e.target.value })}
                  placeholder={f.hint}
                  className="h-9 text-xs"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveProof}
            disabled={savingProof}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {savingProof && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save proof numbers
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <h4 className="text-xs font-bold text-foreground mb-2">Golden Ticket booking link</h4>
          <p className="text-[11px] text-muted-foreground mb-2">
            Shown on the confirmation screen as “Skip the line — book your call now”.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={calendly}
              onChange={(e) => setCalendly(e.target.value)}
              placeholder="https://calendly.com/..."
              className="h-8 flex-1 min-w-[220px] text-xs"
            />
            <button
              onClick={saveCalendly}
              disabled={savingCalendly}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {savingCalendly && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>

      <AdminRecruitingContent />
    </div>
  );
}
