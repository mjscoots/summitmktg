import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Row {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  roles: string[] | null;
  status: string | null;
  direct_manager: string | null;
  team_name: string | null;
  rank_name: string | null;
  vertical: string | null;
  reason: string | null;
  was_archived: boolean | null;
  last_active_at: string | null;
  revenue_to_date: number | null;
  restored_at: string | null;
  request_id: string | null;
}

type RoleOption = 'rookie' | 'manager' | 'admin' | 'president';

/** Admin -> People -> Restore access. Reads the 2027 reset snapshot. */
export default function RestoreAccessPanel() {
  const { role } = useAuth();
  const isOwner = role === 'owner';
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [withRow, setWithRow] = useState<Row | null>(null);
  const [withRole, setWithRole] = useState<RoleOption>('rookie');
  const [withManager, setWithManager] = useState('');
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_access_reset_rows', {
      _search: search.trim() || null,
    });
    if (error) toast({ title: 'Could not load the reset list', variant: 'destructive' });
    setRows(((data as unknown as Row[]) || []).filter((r) => !r.restored_at));
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .rpc('get_manager_directory')
      .then(({ data }) => setManagers((data as unknown as { user_id: string; full_name: string }[]) || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restore = async (
    row: Row,
    opts: { role?: RoleOption; manager?: string; override?: boolean } = {},
  ) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('restore_access', {
      _user_id: row.user_id,
      _role: opts.role ?? null,
      _manager: opts.manager ?? null,
      _owner_override: opts.override ?? false,
    });
    setBusy(false);
    const res = data as { success?: boolean; error?: string; role?: string } | null;
    if (error || !res?.success) {
      toast({ title: res?.error || error?.message || 'Restore failed', variant: 'destructive' });
      return false;
    }
    toast({ title: `${row.full_name} restored as ${res.role}` });
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    return true;
  };

  const bulkRestore = async () => {
    const targets = rows.filter((r) => selected.has(r.id) && r.reason !== 'parks_removed');
    for (const t of targets) await restore(t);
  };

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search.trim() ||
          r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          (r.email || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
        {selected.size > 0 && (
          <Button size="sm" onClick={bulkRestore} disabled={busy}>
            Restore {selected.size} selected
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one left to restore.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2">Name</th>
                <th className="p-2">Previous role</th>
                <th className="p-2">Manager</th>
                <th className="p-2">Team</th>
                <th className="p-2">Rank</th>
                <th className="p-2">Industry</th>
                <th className="p-2">Last active</th>
                <th className="p-2">Revenue</th>
                <th className="p-2">Reason</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const removed = r.reason === 'parks_removed';
                return (
                  <tr key={r.id} className="border-t border-border/50">
                    <td className="p-2">
                      {!removed && (
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <div className="font-medium text-foreground">{r.full_name}</div>
                      {r.request_id && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Requested access
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">{(r.roles || []).join(', ') || 'rookie'}</td>
                    <td className="p-2">{r.direct_manager || '-'}</td>
                    <td className="p-2">{r.team_name || '-'}</td>
                    <td className="p-2">{r.rank_name || '-'}</td>
                    <td className="p-2">{r.vertical || '-'}</td>
                    <td className="p-2">
                      {r.last_active_at ? format(new Date(r.last_active_at), 'MMM d') : '-'}
                    </td>
                    <td className="p-2">
                      {r.revenue_to_date ? `$${Math.round(r.revenue_to_date).toLocaleString()}` : '-'}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{r.reason}</td>
                    <td className="p-2">
                      {removed ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Removed</span>
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `${r.full_name} was removed with the Parks system. Restore anyway?`,
                                  )
                                )
                                  restore(r, { override: true });
                              }}
                            >
                              Override
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button size="sm" disabled={busy} onClick={() => restore(r)}>
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => restore(r, { role: 'rookie' })}
                          >
                            As rookie
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setWithRow(r);
                              setWithRole('rookie');
                              setWithManager(r.direct_manager || '');
                            }}
                          >
                            With…
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {withRow && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Restore {withRow.full_name} with…</p>
          <select
            className="input-field w-full"
            value={withRole}
            onChange={(e) => setWithRole(e.target.value as RoleOption)}
          >
            <option value="rookie">Rookie</option>
            <option value="manager">Manager</option>
            {isOwner && <option value="admin">Admin</option>}
            {isOwner && <option value="president">Industry lead</option>}
          </select>
          <select
            className="input-field w-full"
            value={withManager}
            onChange={(e) => setWithManager(e.target.value)}
          >
            <option value="">No manager</option>
            {managers.map((m) => (
              <option key={m.user_id} value={m.full_name}>
                {m.full_name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const ok = await restore(withRow, { role: withRole, manager: withManager });
                if (ok) setWithRow(null);
              }}
            >
              Restore
            </Button>
            <Button size="sm" variant="outline" onClick={() => setWithRow(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
