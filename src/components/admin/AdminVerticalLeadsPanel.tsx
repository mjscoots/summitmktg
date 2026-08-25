import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Building2, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';
const NONE = 'none';

interface Person {
  user_id: string;
  full_name: string | null;
  vertical: string | null;
  runs_vertical: boolean | null;
}

interface Path {
  vertical: string;
  label: string;
}

/** Industry leads ("Pest Lead", "Fiber Lead") and the recruiter role. Both are audit-logged. */
export function AdminVerticalLeadsPanel() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [recruiters, setRecruiters] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: vp }, { data: ps }, { data: rr }] = await Promise.all([
      supabase.from('vertical_paths').select('vertical, label').order('display_order'),
      supabase
        .from('profiles')
        .select('user_id, full_name, vertical, runs_vertical')
        .eq('archived', false)
        .order('full_name'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'recruiter' as never),
    ]);
    setPaths((vp as Path[]) ?? []);
    setPeople((ps as Person[]) ?? []);
    setRecruiters(((rr as { user_id: string }[]) ?? []).map((r) => r.user_id));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const leadFor = (vertical: string) =>
    people.find((p) => p.vertical === vertical && p.runs_vertical === true) ?? null;

  const setLead = async (vertical: string, userId: string) => {
    setBusy(vertical);
    const current = leadFor(vertical);
    if (current && current.user_id !== userId) {
      await (supabase as any).rpc('admin_set_vertical_lead', {
        _user_id: current.user_id,
        _vertical: vertical,
        _is_lead: false,
      });
    }
    let error: { message: string } | null = null;
    if (userId !== NONE) {
      const res = await (supabase as any).rpc('admin_set_vertical_lead', {
        _user_id: userId,
        _vertical: vertical,
        _is_lead: true,
      });
      error = res.error;
    }
    setBusy(null);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${vertical} lead updated` });
    load();
  };

  const toggleRecruiter = async (person: Person, on: boolean) => {
    setBusy(person.user_id);
    const { data, error } = await (supabase as any).rpc('admin_set_recruiter_role', {
      _user_id: person.user_id,
      _on: on,
    });
    setBusy(null);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not save', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: on ? 'Recruiter role added' : 'Recruiter role removed' });
    load();
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return people.filter((p) => (p.full_name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [people, search]);

  if (loading) {
    return <div className={CARD}><p className="text-sm text-muted-foreground">Loading industry leads...</p></div>;
  }

  return (
    <section className={CARD}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Industry leads</h2>
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Whoever runs an industry. Changes are written to the audit log.
      </p>

      <div className="mt-4 space-y-2">
        {paths.map((p) => {
          const lead = leadFor(p.vertical);
          return (
            <div
              key={p.vertical}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-[13px] font-semibold text-foreground">{p.vertical} Lead</p>
                <p className="text-[12px] text-muted-foreground">
                  {lead?.full_name || `Assign ${p.vertical} lead`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {busy === p.vertical && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Select
                  value={lead?.user_id ?? NONE}
                  onValueChange={(v) => setLead(p.vertical, v)}
                  disabled={busy === p.vertical}
                >
                  <SelectTrigger className="h-9 w-full bg-card/50 sm:w-64">
                    <SelectValue placeholder="Assign lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No lead</SelectItem>
                    {people.map((x) => (
                      <SelectItem key={x.user_id} value={x.user_id}>{x.full_name || 'Unnamed'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        {paths.length === 0 && <p className="text-[13px] text-muted-foreground">No industries yet.</p>}
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="text-[13px] font-semibold text-foreground">Recruiter role</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Recruits, referral link, Golden Tickets, chat and events. No team management, no approvals.
        </p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="mt-2 border-border/30 bg-card/50"
        />
        <div className="mt-2 space-y-2">
          {results.map((p) => {
            const on = recruiters.includes(p.user_id);
            return (
              <div
                key={p.user_id}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground">{p.full_name || 'Unnamed'}</p>
                  <p className="text-[12px] text-muted-foreground">{on ? 'Recruiter' : 'Not a recruiter'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {busy === p.user_id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Button
                    size="sm"
                    variant={on ? 'default' : 'outline'}
                    className="h-9 text-xs"
                    disabled={busy === p.user_id}
                    onClick={() => toggleRecruiter(p, !on)}
                  >
                    {on ? 'Remove recruiter' : 'Make recruiter'}
                  </Button>
                </div>
              </div>
            );
          })}
          {search.trim() && results.length === 0 && (
            <p className="text-[13px] text-muted-foreground">No matches.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminVerticalLeadsPanel;
