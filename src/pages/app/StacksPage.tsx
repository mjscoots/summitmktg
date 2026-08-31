import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingList } from '@/components/shared/LoadingList';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface Carrier { id: string; vertical: string; name: string }
interface Rank { id: string; name: string }
interface BoardRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  rank_id: string | null;
  rank_name: string | null;
  carrier_specific: boolean;
  note: string | null;
  stack_value: number | null;
  stack_unit: string | null;
  manager_name: string | null;
}

/**
 * The stack text next to a name. A value is only ever shown when the database
 * marked that rank, vertical and carrier confirmed, so an unconfirmed number
 * can never reach the screen.
 */
export function stackText(row: { rank_name: string | null; stack_value: number | null }): string {
  const name = row.rank_name || 'No rank yet';
  if (row.stack_value == null) return name;
  return `${name} · $${Math.round(row.stack_value).toLocaleString()}`;
}

export default function StacksPage() {
  const { role, user, isLoading: authLoading } = useAuth();
  const { activeVertical } = useWorkspace();
  const isStaff = role === 'admin' || role === 'owner';

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const vertical = activeVertical || 'Fiber';
  const [carrierId, setCarrierId] = useState<string>('');
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [editing, setEditing] = useState<BoardRow | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([
        supabase.from('carriers').select('id, vertical, name').eq('active', true).order('vertical').order('name'),
        supabase.from('ranks').select('id, name').order('sort_order'),
      ]);
      setCarriers((c.data as Carrier[]) ?? []);
      setRanks((r.data as Rank[]) ?? []);
    })();
  }, []);

  const verticalCarriers = useMemo(
    () => carriers.filter((c) => c.vertical === vertical),
    [carriers, vertical],
  );

  useEffect(() => {
    if (verticalCarriers.length === 0) { setCarrierId(''); return; }
    if (!verticalCarriers.some((c) => c.id === carrierId)) setCarrierId(verticalCarriers[0].id);
  }, [verticalCarriers, carrierId]);

  const load = useCallback(async () => {
    if (authLoading || !user) return;
    if (!carrierId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('manager_stack_board', {
      _carrier_id: carrierId,
      _manager: null,
      _vertical: activeVertical,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows(((data?.rows as BoardRow[]) ?? []));
  }, [carrierId, authLoading, user]);

  useEffect(() => { void load(); }, [load]);

  const managers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.manager_name).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (managerFilter !== 'all' && r.manager_name !== managerFilter) return false;
      if (!q) return true;
      return (r.full_name || '').toLowerCase().includes(q);
    });
  }, [rows, search, managerFilter]);

  const save = async (rankId: string) => {
    if (!editing) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('set_rep_carrier_rank', {
      _user_id: editing.user_id,
      _carrier_id: carrierId,
      _rank_id: rankId,
      _note: note.trim() || null,
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Could not save that');
      return;
    }
    toast.success('Stack updated');
    setEditing(null);
    setNote('');
    void load();
  };

  const selectClass =
    'min-h-11 rounded border border-border bg-card px-3 text-[13px] text-foreground';

  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader
          title="Stacks"
          context={isStaff ? 'Every rep, by carrier.' : 'Your reps, by carrier.'}
        />

        <div className="flex flex-wrap gap-2">
          <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className={selectClass}>
            {verticalCarriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isStaff && managers.length > 0 && (
            <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} className={selectClass}>
              <option value="all">All managers</option>
              {managers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a name"
          className="min-h-11"
        />

        {loading ? (
          <LoadingList rows={6} />
        ) : visible.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            {verticalCarriers.length === 0 ? 'No carriers set up for this industry yet.' : 'Nobody here yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded border border-border bg-card">
            {visible.map((r) => (
              <li key={r.user_id}>
                <button
                  type="button"
                  onClick={() => { setEditing(r); setNote(r.note || ''); }}
                  className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left"
                >
                  <UserAvatar avatarUrl={r.avatar_url} fullName={r.full_name} size="md" className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-foreground">{r.full_name || 'Unnamed'}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{stackText(r)}</span>
                  </span>
                  <span className={cn('text-[12px]', r.carrier_specific ? 'text-primary' : 'text-muted-foreground')}>
                    {r.carrier_specific ? 'Set' : 'Default'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Sheet open={!!editing} onOpenChange={(v) => { if (!v) { setEditing(null); setNote(''); } }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.full_name || 'Set stack'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <p className="text-[13px] text-muted-foreground">{editing ? stackText(editing) : ''}</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note, optional"
              rows={2}
            />
            <div className="space-y-2">
              {ranks.map((rk) => (
                <Button
                  key={rk.id}
                  variant={editing?.rank_id === rk.id ? 'default' : 'outline'}
                  className="min-h-11 w-full justify-start"
                  disabled={busy}
                  onClick={() => save(rk.id)}
                >
                  {rk.name}
                </Button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
