import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InviteDialog } from '@/components/invites/InviteDialog';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { tierOf } from '@/lib/tiers';
import MovePersonSheet from '@/components/admin/MovePersonSheet';

interface SeatRow {
  user_id: string;
  full_name: string;
  team_name: string | null;
  vertical: string | null;
  manager_id: string | null;
  manager_name: string | null;
  manager_departed: boolean;
  has_account: boolean;
  last_active_at: string | null;
  days_since: number | null;
  role: string | null;
  has_manager_role: boolean;
  effective_manager: boolean;
  invite_id: string | null;
  invite_token: string | null;
  invite_state: 'none' | 'open' | 'expired' | 'used' | 'revoked';
}

interface SeatsData {
  rows: SeatRow[];
  active_7: number;
  dark_8_29: number;
  dark_30: number;
  no_account: number;
  managers_missing_role: number;
}

const EMPTY: SeatsData = { rows: [], active_7: 0, dark_8_29: 0, dark_30: 0, no_account: 0, managers_missing_role: 0 };

const inviteLabel: Record<SeatRow['invite_state'], string> = {
  none: 'No invite',
  open: 'Invite open',
  expired: 'Invite expired',
  used: 'Invite used',
  revoked: 'Invite revoked',
};

const activityText = (row: SeatRow) => {
  if (!row.last_active_at || row.days_since === null) return 'No activity on record';
  const date = new Date(row.last_active_at).toLocaleDateString();
  if (row.days_since <= 0) return `Last active today · ${date}`;
  return `Last active ${date} · ${row.days_since} ${row.days_since === 1 ? 'day' : 'days'} ago`;
};

const linkFor = (token: string) => `${window.location.origin}/invite/${token}`;


/** Admin -> People -> Seats. Who has been let in the door, and one tap to hand out the app. */
export default function SeatsPanel() {
  const { role: myRole } = useAuth();
  const isOwner = tierOf(myRole) === 'owner';
  const [data, setData] = useState<SeatsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string>('');
  const [moving, setMoving] = useState<SeatRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await (supabase.rpc as any)('seats_rows');
    if (error) toast.error(error.message);
    setData(res ? ({ ...EMPTY, ...(res as SeatsData) }) : EMPTY);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveManagers = useMemo(
    () => data.rows.filter((r) => r.effective_manager).map((r) => ({ user_id: r.user_id, full_name: r.full_name })),
    [data.rows]
  );

  const filtered = useMemo(
    () => data.rows.filter((r) => r.full_name.toLowerCase().includes(search.trim().toLowerCase())),
    [data.rows, search]
  );

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const createInvite = async (row: SeatRow) => {
    setBusy(row.user_id);
    const { data: res, error } = await (supabase.rpc as any)('create_seat_invite', { _user_id: row.user_id, _days: 14 });
    setBusy(null);
    if (error) return toast.error(error.message);
    const token = (res as { token?: string })?.token;
    if (token) await copy(linkFor(token));
    void load();
  };

  const revokeInvite = async (row: SeatRow) => {
    if (!row.invite_id) return;
    setBusy(row.user_id);
    const { error } = await (supabase.rpc as any)('revoke_seat_invite', { _invite_id: row.invite_id });
    setBusy(null);
    if (error) return toast.error(error.message);
    void load();
  };

  const accountless = useMemo(() => data.rows.filter((r) => !r.has_account), [data.rows]);

  const createAll = async () => {
    const targets = accountless.filter((r) => r.invite_state !== 'open' && r.invite_state !== 'used');
    if (!targets.length) return toast.info('Everyone without an account already has an open invite');

    setBusy('all');
    const lines: string[] = [];
    for (const row of targets) {
      const { data: res, error } = await (supabase.rpc as any)('create_seat_invite', { _user_id: row.user_id, _days: 14 });
      const token = (res as { token?: string })?.token;
      if (!error && token) lines.push(`${row.full_name}: ${linkFor(token)}`);
    }
    setBusy(null);
    setBulk(lines.join('\n'));
    void load();
  };

  const setManagerRole = async (row: SeatRow, grant: boolean) => {
    setBusy(row.user_id);
    const { error } = await (supabase.rpc as any)('set_manager_seat', { _user_id: row.user_id, _grant: grant });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(grant ? `${row.full_name} has manager access` : `Manager access removed for ${row.full_name}`);
    void load();
  };

  const reassign = async (row: SeatRow, managerId: string) => {
    setBusy(row.user_id);
    const { error } = await (supabase.rpc as any)('seat_set_manager', { _user_id: row.user_id, _new_manager: managerId });
    setBusy(null);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Coldest first. An invite is a link, and only people without an account need one. Nothing is emailed or texted
        from here.
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-[var(--radius)] border border-border/60 bg-surface px-3 py-2 text-[12px] text-muted-foreground">
          Active in the last 7 days <span className="font-semibold text-foreground">{data.active_7}</span>
        </span>
        <span className="rounded-[var(--radius)] border border-border/60 bg-surface px-3 py-2 text-[12px] text-muted-foreground">
          Dark 8 to 29 days <span className="font-semibold text-foreground">{data.dark_8_29}</span>
        </span>
        <span className="rounded-[var(--radius)] border border-border/60 bg-surface px-3 py-2 text-[12px] text-muted-foreground">
          Dark 30 days or more <span className="font-semibold text-foreground">{data.dark_30}</span>
        </span>
        <span className="rounded-[var(--radius)] border border-border/60 bg-surface px-3 py-2 text-[12px] text-muted-foreground">
          Managers missing a role <span className="font-semibold text-foreground">{data.managers_missing_role}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name"
          className="h-11 min-w-[180px] flex-1 text-[13px]"
        />
        <InviteDialog triggerLabel="Invite by link" />
        {accountless.length > 0 && (
          <Button variant="outline" className="min-h-11" onClick={createAll} disabled={busy === 'all'}>
            {busy === 'all' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create invites for {accountless.length} without an account
          </Button>
        )}
      </div>



      {bulk && (
        <div className="rounded-[var(--radius)] border border-border/60 bg-surface p-3">
          <p className="text-[12px] text-muted-foreground">New invite links</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[12px] text-foreground">{bulk}</pre>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="min-h-11" onClick={() => copy(bulk)}>Copy list</Button>
            <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setBulk('')}>Clear</Button>
          </div>
        </div>
      )}

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No active people to show.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <div key={row.user_id} className="rounded-[var(--radius)] border border-border/60 bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">{row.full_name}</p>
                {(row.days_since === null || row.days_since >= 30) && (
                  <span className="rounded-full bg-[hsl(var(--celebrate-warm)/0.16)] px-2 py-1 text-[11px] text-[hsl(var(--celebrate-warm))]">
                    Dark 30 days or more
                  </span>
                )}
                {!row.has_account && (
                  <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    No account
                  </span>
                )}
                {!row.has_account && (
                  <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    {inviteLabel[row.invite_state]}
                  </span>
                )}
                <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                  {row.role ? `Role: ${row.role}` : 'No role'}
                </span>
              </div>

              <p className="mt-1 text-[12px] text-foreground">{activityText(row)}</p>

              <p className="mt-1 text-[12px] text-muted-foreground">
                {row.team_name || 'No team'} · {row.manager_name || 'No manager'}
                {row.manager_departed ? ' · Manager departed' : ''}
                {row.vertical ? ` · ${row.vertical}` : ''}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!row.has_account && (
                  <Button size="sm" variant="outline" className="min-h-11" disabled={busy === row.user_id} onClick={() => createInvite(row)}>
                    {busy === row.user_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create invite
                  </Button>
                )}

                {row.invite_token && row.invite_state === 'open' && (
                  <>
                    <Button size="sm" variant="ghost" className="min-h-11" onClick={() => copy(linkFor(row.invite_token as string))}>
                      Copy link
                    </Button>
                    <Button size="sm" variant="ghost" className="min-h-11" disabled={busy === row.user_id} onClick={() => revokeInvite(row)}>
                      Revoke
                    </Button>
                  </>
                )}

                {row.effective_manager && !row.has_manager_role && (
                  isOwner ? (
                    <Button size="sm" className="min-h-11" disabled={busy === row.user_id} onClick={() => setManagerRole(row, true)}>
                      Grant manager access
                    </Button>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">Has people, no manager role. The owner grants this</span>
                  )
                )}
                {isOwner && row.role === 'manager' && (
                  <Button size="sm" variant="ghost" className="min-h-11" disabled={busy === row.user_id} onClick={() => setManagerRole(row, false)}>
                    Remove manager access
                  </Button>
                )}
                {isOwner && (
                  <Button size="sm" variant="outline" className="min-h-11" onClick={() => setMoving(row)}>
                    Move
                  </Button>
                )}
              </div>

              {row.manager_departed && (
                <div className="mt-2">
                  <Select disabled={busy === row.user_id} onValueChange={(v) => reassign(row, v)}>
                    <SelectTrigger className="h-11 w-full max-w-[280px] text-[13px]">
                      <SelectValue placeholder="Pick a live manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {liveManagers
                        .filter((m) => m.user_id !== row.user_id)
                        .map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                            {m.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {moving && (
        <MovePersonSheet
          userId={moving.user_id}
          fullName={moving.full_name}
          open
          onOpenChange={(o) => !o && setMoving(null)}
          onMoved={load}
        />
      )}
    </div>
  );
}
