import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingList } from '@/components/shared/LoadingList';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Layers, Save } from 'lucide-react';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-4';

interface Rank { id: string; name: string; sort_order: number }
interface Carrier { id: string; vertical: string; name: string; active: boolean; public: boolean }
interface Stack {
  id: string;
  rank_id: string;
  vertical: string;
  carrier_id: string | null;
  value: number | null;
  unit: string | null;
  confirmed: boolean;
}
interface Requirement {
  id: string;
  from_rank_id: string;
  vertical: string | null;
  rule_type: string;
  value: number | null;
  window_weeks: number | null;
  description: string | null;
  confirmed: boolean;
}

const SETTING_KEYS = [
  { key: 'summit_stack_fiber_sonic', label: 'Summit stack — Fiber / Sonic' },
  { key: 'summit_stack_fiber_surf', label: 'Summit stack — Fiber / Surf' },
  { key: 'vertical_lead_margin', label: 'Vertical lead margin (Summit stack minus this)' },
  { key: 'fiber_expense_allowance_per_install', label: 'Fiber expense allowance per install' },
  { key: 'fiber_holdback_percent', label: 'Fiber holdback percent' },
  { key: 'producing_rep_definition', label: 'Producing rep definition' },
];

function DraftBadge({ confirmed }: { confirmed: boolean }) {
  if (confirmed) {
    return <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Confirmed</span>;
  }
  return <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">Draft</span>;
}

/** Admin -> Money -> Ranks & Stacks: one rank per person, stack values per industry/carrier. */
export function RanksStacksPanel() {
  const [loading, setLoading] = useState(true);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [stackDrafts, setStackDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c, s, q, a] = await Promise.all([
      supabase.from('ranks').select('*').order('sort_order'),
      supabase.from('carriers').select('*').order('vertical').order('name'),
      supabase.from('rank_stacks').select('*'),
      supabase.from('rank_requirements').select('*'),
      supabase.from('app_settings').select('key, value'),
    ]);
    setRanks((r.data as Rank[]) ?? []);
    setCarriers((c.data as Carrier[]) ?? []);
    setStacks((s.data as Stack[]) ?? []);
    setReqs((q.data as Requirement[]) ?? []);
    const map: Record<string, string> = {};
    (a.data ?? []).forEach((row: any) => { map[row.key] = row.value ?? ''; });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rankName = (id: string) => ranks.find((r) => r.id === id)?.name ?? '—';

  const fiberCarriers = useMemo(() => carriers.filter((c) => c.vertical === 'Fiber'), [carriers]);

  const renameRank = async (id: string) => {
    const name = (nameDrafts[id] ?? '').trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from('ranks').update({ name }).eq('id', id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Rank renamed');
    setNameDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    load();
  };

  const moveRank = async (id: string, dir: -1 | 1) => {
    const idx = ranks.findIndex((r) => r.id === id);
    const other = ranks[idx + dir];
    if (!other) return;
    const me = ranks[idx];
    setBusy(true);
    await supabase.from('ranks').update({ sort_order: other.sort_order }).eq('id', me.id);
    await supabase.from('ranks').update({ sort_order: me.sort_order }).eq('id', other.id);
    setBusy(false);
    load();
  };

  const saveStack = async (row: Stack) => {
    const raw = stackDrafts[row.id];
    const value = raw === undefined ? row.value : raw.trim() === '' ? null : Number(raw.replace(/[$,\s]/g, ''));
    if (value !== null && !Number.isFinite(value)) { toast.error('Enter a number'); return; }
    setBusy(true);
    const { error } = await supabase.from('rank_stacks').update({ value }).eq('id', row.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    load();
  };

  const setTableConfirmed = async (ids: string[], confirmed: boolean) => {
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from('rank_stacks').update({ confirmed }).in('id', ids);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const setReqConfirmed = async (ids: string[], confirmed: boolean) => {
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from('rank_requirements').update({ confirmed }).in('id', ids);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const saveReq = async (row: Requirement, patch: Partial<Requirement>) => {
    setBusy(true);
    const { error } = await supabase.from('rank_requirements').update(patch).eq('id', row.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    load();
  };

  const saveSetting = async (key: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: settings[key] ?? '' }, { onConflict: 'key' });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
  };

  if (loading) return <LoadingList rows={6} />;

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <div className="mb-1 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ranks</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          One rank per person, carried across every industry. Rank sets the pay level; each industry keeps its own gate.
        </p>
        <div className="mt-3 divide-y divide-white/[0.05]">
          {ranks.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 py-2">
              <span className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <Input
                value={nameDrafts[r.id] ?? r.name}
                onChange={(e) => setNameDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                className="h-8 max-w-[240px] border-white/[0.08] bg-background/60 text-xs"
              />
              {(nameDrafts[r.id] ?? r.name) !== r.name && (
                <Button size="sm" className="h-8 gap-1 text-xs" disabled={busy} onClick={() => renameRank(r.id)}>
                  <Save className="h-3 w-3" /> Save
                </Button>
              )}
              <div className="ml-auto flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy || i === 0} onClick={() => moveRank(r.id, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy || i === ranks.length - 1} onClick={() => moveRank(r.id, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {fiberCarriers.map((carrier) => {
        const rows = ranks
          .map((r) => stacks.find((s) => s.rank_id === r.id && s.vertical === 'Fiber' && s.carrier_id === carrier.id))
          .filter(Boolean) as Stack[];
        const allConfirmed = rows.length > 0 && rows.every((r) => r.confirmed);
        return (
          <div key={carrier.id} className={CARD}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Fiber — {carrier.name}</h3>
              <DraftBadge confirmed={allConfirmed} />
              <span className="text-xs text-muted-foreground">per install</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-8 text-xs"
                disabled={busy}
                onClick={() => setTableConfirmed(rows.map((r) => r.id), !allConfirmed)}
              >
                {allConfirmed ? 'Mark as draft' : 'Confirm table'}
              </Button>
            </div>
            <div className="mt-3 divide-y divide-white/[0.05]">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{rankName(row.rank_id)}</span>
                  <Input
                    value={stackDrafts[row.id] ?? (row.value != null ? String(row.value) : '')}
                    onChange={(e) => setStackDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                    placeholder="Not set"
                    className="h-8 w-28 border-white/[0.08] bg-background/60 text-xs tabular-nums"
                  />
                  <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy} onClick={() => saveStack(row)}>
                    Save
                  </Button>
                </div>
              ))}
              {rows.length === 0 && <p className="py-3 text-xs text-muted-foreground">No rows.</p>}
            </div>
          </div>
        );
      })}

      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Pest</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pest pay stays on the existing pay scale engine — commission tiers on revenue. Nothing to set here.
        </p>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Life insurance</h3>
        <p className="mt-1 text-xs text-muted-foreground">Not set. Add stack values when the carrier terms are settled.</p>
      </div>

      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Tier-up requirements</h3>
          <DraftBadge confirmed={reqs.length > 0 && reqs.every((r) => r.confirmed)} />
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-8 text-xs"
            disabled={busy}
            onClick={() => {
              const allConfirmed = reqs.length > 0 && reqs.every((r) => r.confirmed);
              setReqConfirmed(reqs.map((r) => r.id), !allConfirmed);
            }}
          >
            {reqs.length > 0 && reqs.every((r) => r.confirmed) ? 'Mark as draft' : 'Confirm requirements'}
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {ranks.map((r) => {
            const rows = reqs.filter((q) => q.from_rank_id === r.id);
            return (
              <div key={r.id} className="rounded-xl border border-white/[0.05] bg-background/30 p-3">
                <p className="text-xs font-semibold text-foreground">From {r.name}</p>
                {rows.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Not set</p>}
                {rows.map((row) => (
                  <div key={row.id} className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{row.vertical ?? 'All industries'}</span>
                    <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-foreground">{row.rule_type}</span>
                    <Input
                      defaultValue={row.value != null ? String(row.value) : ''}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        const v = t === '' ? null : Number(t);
                        if (v !== row.value) saveReq(row, { value: v });
                      }}
                      placeholder="Not set"
                      className="h-8 w-24 border-white/[0.08] bg-background/60 text-xs tabular-nums"
                    />
                    <Input
                      defaultValue={row.window_weeks != null ? String(row.window_weeks) : ''}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        const v = t === '' ? null : Number(t);
                        if (v !== row.window_weeks) saveReq(row, { window_weeks: v });
                      }}
                      placeholder="weeks"
                      className="h-8 w-20 border-white/[0.08] bg-background/60 text-xs tabular-nums"
                    />
                    <Input
                      defaultValue={row.description ?? ''}
                      onBlur={(e) => {
                        const t = e.target.value;
                        if (t !== (row.description ?? '')) saveReq(row, { description: t });
                      }}
                      placeholder="Description"
                      className="h-8 min-w-[200px] flex-1 border-white/[0.08] bg-background/60 text-xs"
                    />
                    <DraftBadge confirmed={row.confirmed} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Stack visibility</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Who can see the stacks above their own. Draft tables never show to reps.
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">How far up a person can see</span>
            <div className="flex gap-2">
              <select
                value={settings['stack_visibility'] ?? 'direct_leader'}
                onChange={(e) => setSettings((d) => ({ ...d, stack_visibility: e.target.value }))}
                className="h-8 rounded-md border border-white/[0.08] bg-background/60 px-2 text-xs text-foreground"
              >
                <option value="self">Their own stack only</option>
                <option value="direct_leader">Their own plus their direct leader</option>
                <option value="full_chain">The full chain up to Summit</option>
              </select>
              <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy} onClick={() => saveSetting('stack_visibility')}>
                Save
              </Button>
            </div>
          </label>
          {[
            { key: 'show_stacks_to_rookies', label: 'Show dollar values above their own to Rookie-rank reps' },
            { key: 'publish_stacks_publicly', label: 'Publish pay tables on the public site' },
          ].map((t) => {
            const on = (settings[t.key] ?? 'false') === 'true';
            return (
              <div key={t.key} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{t.label}</span>
                <Button
                  size="sm"
                  variant={on ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    const next = on ? 'false' : 'true';
                    setSettings((d) => ({ ...d, [t.key]: next }));
                    setBusy(true);
                    const { error } = await supabase
                      .from('app_settings')
                      .upsert({ key: t.key, value: next }, { onConflict: 'key' });
                    setBusy(false);
                    if (error) { toast.error(error.message); return; }
                    toast.success('Saved');
                  }}
                >
                  {on ? 'On' : 'Off'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-semibold text-foreground">Settings</h3>

        <div className="mt-3 space-y-3">
          {SETTING_KEYS.map((s) => (
            <label key={s.key} className="block">
              <span className="mb-1 block text-[11px] text-muted-foreground">{s.label}</span>
              <div className="flex gap-2">
                <Input
                  value={settings[s.key] ?? ''}
                  onChange={(e) => setSettings((d) => ({ ...d, [s.key]: e.target.value }))}
                  placeholder="Not set"
                  className={cn('h-8 border-white/[0.08] bg-background/60 text-xs', s.key === 'producing_rep_definition' ? '' : 'max-w-[180px] tabular-nums')}
                />
                <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy} onClick={() => saveSetting(s.key)}>
                  Save
                </Button>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RanksStacksPanel;
