import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { TIERS, tierLabel, tierOf, type Tier } from '@/lib/tiers';

interface Row {
  user_id: string;
  full_name: string;
  role: string | null;
  can_recruit: boolean | null;
}

/** Admin -> People -> Access tiers. Four tiers only; the owner alone grants admin. */
export default function AccessTiersPanel() {
  const { role: myRole } = useAuth();
  const isOwner = tierOf(myRole) === 'owner';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, full_name, can_recruit')
        .eq('approved', true)
        .eq('archived', false)
        .order('full_name'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    const roleMap = new Map<string, string>();
    ((roles as { user_id: string; role: string }[]) || []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      const rank = ['rookie', 'recruiter', 'manager', 'president', 'admin', 'owner'];
      if (!cur || rank.indexOf(r.role) > rank.indexOf(cur)) roleMap.set(r.user_id, r.role);
    });
    setRows(
      ((profiles as { user_id: string | null; full_name: string | null; can_recruit: boolean | null }[]) || [])
        .filter((p) => !!p.user_id)
        .map((p) => ({
          user_id: p.user_id as string,
          full_name: p.full_name || 'Unnamed',
          role: roleMap.get(p.user_id as string) || null,
          can_recruit: p.can_recruit,
        }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => r.full_name.toLowerCase().includes(search.trim().toLowerCase())),
    [rows, search]
  );

  const setTier = async (row: Row, tier: Tier) => {
    setBusy(row.user_id);
    const { error } = await (supabase.rpc as any)('admin_set_tier', { _user_id: row.user_id, _tier: tier });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`${row.full_name} is now ${tierLabel(tier)}`);
      load();
    }
  };

  const setCanRecruit = async (row: Row, value: boolean) => {
    setBusy(row.user_id);
    const { error } = await (supabase.rpc as any)('admin_set_can_recruit', { _user_id: row.user_id, _value: value });
    setBusy(null);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Sales works the field. Manager runs people and leads. Admin runs the system. Only the owner can grant or
        remove admin and owner.
      </p>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name" className="h-10 text-[13px]" />

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const tier = tierOf(row.role);
            const locked = (tier === 'admin' || tier === 'owner') && !isOwner;
            return (
              <div
                key={row.user_id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border/60 bg-surface p-3"
              >
                <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">{row.full_name}</p>
                <Select value={tier} onValueChange={(v) => setTier(row, v as Tier)} disabled={locked || busy === row.user_id}>
                  <SelectTrigger className="h-10 w-[140px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        disabled={(t === 'admin' || t === 'owner') && !isOwner}
                        className="text-[13px]"
                      >
                        {tierLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Switch
                    checked={!!row.can_recruit}
                    disabled={busy === row.user_id}
                    onCheckedChange={(v) => setCanRecruit(row, v)}
                  />
                  Can recruit
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
