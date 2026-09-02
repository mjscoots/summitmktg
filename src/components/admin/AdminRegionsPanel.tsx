import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Map, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';
const NONE = 'none';

interface Region {
  id: string;
  vertical: string;
  name: string;
  lead_user_id: string | null;
  active: boolean;
  accepting_new: boolean;
  capacity: number | null;
  intro: string | null;
}

interface Person {
  user_id: string;
  full_name: string | null;
  region_id: string | null;
}

interface Props {
  /** When set, only this industry's regions are shown. */
  restrictToVertical?: string;
}

/** Admin control for fiber region leads and per-person region assignment. Both are audit-logged. */
export function AdminRegionsPanel({ restrictToVertical }: Props = {}) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase
        .from('regions')
        .select('id, vertical, name, lead_user_id, active, accepting_new, capacity, intro')
        .order('vertical')
        .order('name'),
      supabase.from('profiles').select('user_id, full_name, region_id').eq('archived', false).order('full_name'),
    ]);
    setRegions(((rs as unknown as Region[]) ?? []).filter((r) => !restrictToVertical || r.vertical === restrictToVertical));
    setPeople((ps as Person[]) ?? []);
    setLoading(false);
  }, [restrictToVertical]);

  useEffect(() => { load(); }, [load]);

  const patchRegion = async (region: Region, patch: Partial<Region>) => {
    setRegions((prev) => prev.map((r) => (r.id === region.id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from('regions').update(patch as never).eq('id', region.id);
    if (error) toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
  };


  const setLead = async (region: Region, userId: string) => {
    setBusy(region.id);
    const { data, error } = await supabase.rpc('admin_set_region_lead' as never, {
      _region_id: region.id,
      _user_id: userId === NONE ? null : userId,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not save', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${region.name} lead updated` });
    load();
  };

  const setPersonRegion = async (person: Person, regionId: string) => {
    setBusy(person.user_id);
    const { data, error } = await supabase.rpc('admin_set_person_region' as never, {
      _user_id: person.user_id,
      _region_id: regionId === NONE ? null : regionId,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not save', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Region updated' });
    load();
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return people.filter((p) => (p.full_name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [people, search]);

  const label = (id: string | null) => {
    const r = regions.find((x) => x.id === id);
    return r ? `${r.vertical} - ${r.name}` : 'No region';
  };

  if (loading) return <div className={CARD}><p className="text-sm text-muted-foreground">Loading regions...</p></div>;

  return (
    <section className={CARD}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Map className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Regions</h2>
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Region leads sit under the industry lead. Changes are written to the audit log.
      </p>

      <div className="mt-4 space-y-2">
        {regions.map((r) => (
          <div key={r.id} className="space-y-3 rounded-lg border border-border/50 bg-surface p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {r.vertical} Lead - {r.name}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {people.find((p) => p.user_id === r.lead_user_id)?.full_name || 'No lead assigned'} ·{' '}
                  {people.filter((p) => p.region_id === r.id).length} members
                </p>
              </div>
              <Select
                value={r.lead_user_id ?? NONE}
                onValueChange={(v) => setLead(r, v)}
                disabled={busy === r.id}
              >
                <SelectTrigger className="h-9 w-full sm:w-64 bg-card/50">
                  <SelectValue placeholder="Assign lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No lead</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || 'Unnamed'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={r.accepting_new}
                  onChange={(e) => patchRegion(r, { accepting_new: e.target.checked })}
                />
                Accepting new reps
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">Capacity</span>
                <Input
                  type="number"
                  className="h-9 w-24 bg-card/50"
                  value={r.capacity ?? ''}
                  onChange={(e) =>
                    setRegions((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, capacity: e.target.value ? Number(e.target.value) : null } : x))
                    )
                  }
                  onBlur={(e) => patchRegion(r, { capacity: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>

            <Input
              className="h-9 bg-card/50"
              placeholder="One-line intro for reps"
              value={r.intro ?? ''}
              onChange={(e) => setRegions((prev) => prev.map((x) => (x.id === r.id ? { ...x, intro: e.target.value } : x)))}
              onBlur={(e) => patchRegion(r, { intro: e.target.value || null })}
            />
          </div>
        ))}
        {regions.length === 0 && <p className="text-[13px] text-muted-foreground">No regions yet.</p>}
      </div>


      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="text-[13px] font-semibold text-foreground">Set a person's region</p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="mt-2 bg-card/50 border-border/30"
        />
        <div className="mt-2 space-y-2">
          {results.map((p) => (
            <div key={p.user_id} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground">{p.full_name || 'Unnamed'}</p>
                <p className="text-[12px] text-muted-foreground">{label(p.region_id)}</p>
              </div>
              <div className="flex items-center gap-2">
                {busy === p.user_id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Select
                  value={p.region_id ?? NONE}
                  onValueChange={(v) => setPersonRegion(p, v)}
                  disabled={busy === p.user_id}
                >
                  <SelectTrigger className="h-9 w-full sm:w-56 bg-card/50">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No region</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.vertical} - {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {search.trim() && results.length === 0 && (
            <p className="text-[13px] text-muted-foreground">No matches.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminRegionsPanel;
