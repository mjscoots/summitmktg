import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, Loader2, UserPlus } from 'lucide-react';

type InviteRow = {
  id: string;
  token: string;
  role: string;
  vertical: string | null;
  team_id: string | null;
  region: string | null;
  note: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  revoked_at: string | null;
};

interface InviteDialogProps {
  /** Managers can only invite reps into their own team and vertical. */
  managerLocked?: boolean;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary';
}

const ROLE_OPTIONS = [
  { value: 'rep', label: 'Rep' },
  { value: 'manager', label: 'Manager' },
  { value: 'vertical lead', label: 'Vertical lead' },
];

export function InviteDialog({ managerLocked = false, triggerLabel = 'Invite', triggerVariant = 'outline' }: InviteDialogProps) {
  const { role, profile, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  const locked = managerLocked || !isAdmin;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteRole, setInviteRole] = useState('rep');
  const [vertical, setVertical] = useState<string>(profile?.active_vertical || 'pest');
  const [teamId, setTeamId] = useState<string>(profile?.team_id || '');
  const [region, setRegion] = useState<string>('');
  const [managerId, setManagerId] = useState<string>(user?.id || '');
  const [note, setNote] = useState('');
  const [link, setLink] = useState<string | null>(null);

  const [verticals, setVerticals] = useState<{ vertical: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadRows = useCallback(async () => {
    const { data } = await supabase
      .from('invites')
      .select('id, token, role, vertical, team_id, region, note, created_at, expires_at, used_at, used_by, revoked_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setRows((data as InviteRow[]) || []);
    const userIds = (data || []).map((r) => r.used_by).filter(Boolean) as string[];
    if (userIds.length) {
      const { data: people } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const map: Record<string, string> = {};
      (people || []).forEach((p) => { map[p.user_id] = p.full_name; });
      setNames(map);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [v, t, m] = await Promise.all([
        supabase.from('verticals').select('vertical, name').order('display_order'),
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('profiles').select('user_id, full_name').eq('status', 'active').order('full_name').limit(400),
      ]);
      setVerticals(v.data || []);
      setTeams(t.data || []);
      setManagers(m.data || []);
      loadRows();
    })();
  }, [open, loadRows]);

  const teamName = useCallback((id: string | null) => teams.find((t) => t.id === id)?.name || '—', [teams]);

  const roleOptions = useMemo(() => (isAdmin && !managerLocked ? ROLE_OPTIONS : ROLE_OPTIONS.slice(0, 1)), [isAdmin, managerLocked]);

  const create = async () => {
    if (!user?.id) return;
    setSaving(true);
    setLink(null);
    const { data: token, error: tokenError } = await supabase.rpc('new_invite_token');
    if (tokenError || !token) {
      setSaving(false);
      toast.error('Could not create the invite');
      return;
    }
    const { error } = await supabase.from('invites').insert({
      token: token as string,
      created_by: user.id,
      role: locked ? 'rep' : inviteRole,
      vertical: locked ? profile?.active_vertical || 'pest' : vertical,
      team_id: (locked ? profile?.team_id : teamId) || null,
      region: vertical === 'fiber' && region ? region : locked ? profile?.region || null : null,
      manager_id: locked ? user.id : managerId || null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not create the invite', { description: error.message });
      return;
    }
    setLink(`${window.location.origin}/invite/${token}`);
    setNote('');
    loadRows();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from('invites').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast.error('Could not revoke that invite');
      return;
    }
    loadRows();
  };

  const smsHref = link
    ? `sms:?&body=${encodeURIComponent(`Here is your Summit Trinity invite: ${link}. It works for 7 days.`)}`
    : '#';

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setLink(null); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="min-h-11">
          <UserPlus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>
            One link. It sets their role, vertical, team and manager, and works for 7 days.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Invite link</p>
              <p className="mt-1 break-all text-sm text-foreground">{link}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-11"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success('Link copied');
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button asChild variant="outline" className="min-h-11 sm:hidden">
                <a href={smsHref}>Send by text</a>
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setLink(null)}>
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select value={locked ? 'rep' : inviteRole} onValueChange={setInviteRole} disabled={locked}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vertical</Label>
              <Select value={locked ? profile?.active_vertical || 'pest' : vertical} onValueChange={setVertical} disabled={locked}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {verticals.map((v) => (
                    <SelectItem key={v.vertical} value={v.vertical}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team</Label>
              <Select value={locked ? profile?.team_id || '' : teamId} onValueChange={setTeamId} disabled={locked}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Choose a team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!locked && vertical === 'fiber' && (
              <div>
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="min-h-11"><SelectValue placeholder="Choose a region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Manager</Label>
              <Select value={locked ? user?.id || '' : managerId} onValueChange={setManagerId} disabled={locked}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Choose a manager" /></SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Who this is for" />
            </div>

            <Button onClick={create} disabled={saving} className="min-h-11 w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invite link
            </Button>
          </div>
        )}

        <div className="mt-2 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Open invites</p>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">
                        {r.note || 'No note'} · {r.role} · {r.vertical || '—'} · {teamName(r.team_id)}
                        {r.region ? ` · ${r.region}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(r.created_at).toLocaleDateString()}
                        {r.used_at
                          ? ` · Used by ${names[r.used_by || ''] || 'a new member'} on ${new Date(r.used_at).toLocaleDateString()}`
                          : r.revoked_at
                            ? ' · Revoked'
                            : ` · Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {!r.used_at && !r.revoked_at && (
                      <Button variant="ghost" size="sm" className="min-h-11" onClick={() => revoke(r.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InviteDialog;
