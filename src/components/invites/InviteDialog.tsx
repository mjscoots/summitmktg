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
import { Copy, Loader2, Share2, UserPlus } from 'lucide-react';

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
  const [vertical, setVertical] = useState<string>(profile?.active_vertical || 'Pest');
  const [teamId, setTeamId] = useState<string>(profile?.team_id || '');
  const [region, setRegion] = useState<string>('');
  const [managerId, setManagerId] = useState<string>(user?.id || '');
  const [experience, setExperience] = useState<'rookie' | 'veteran'>('rookie');
  const [note, setNote] = useState('');
  const [expiresDays, setExpiresDays] = useState('7');
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
      region: vertical.toLowerCase() === 'fiber' && region ? region : locked ? profile?.region || null : null,
      manager_id: locked ? user.id : managerId || null,
      experience_level: experience,
      note: note.trim() || null,
      expires_at: new Date(Date.now() + Number(expiresDays) * 86_400_000).toISOString(),
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

  const shareText = (url: string) =>
    `Here is your Summit invite: ${url}. It works for ${expiresDays} days.`;

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const shareLink = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Summit invite', text: shareText(url), url });
        return;
      } catch {
        return;
      }
    }
    await copyLink(url);
  };

  const rowStatus = (r: InviteRow): string => {
    if (r.used_at) return 'Redeemed';
    if (r.revoked_at) return 'Revoked';
    if (new Date(r.expires_at).getTime() < Date.now()) return 'Expired';
    return 'Pending';
  };

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
            This makes a link. Send it yourself. Whoever opens it lands in the app on this team,
            waiting for your approval.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Invite link</p>
              <p className="mt-2 break-all text-base font-semibold leading-snug text-foreground">{link}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Single use · expires in {expiresDays} days
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11 flex-1" onClick={() => copyLink(link)}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => shareLink(link)}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setLink(null)}>
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Rookie or vet</Label>
              <Select value={experience} onValueChange={(value) => setExperience(value === 'veteran' ? 'veteran' : 'rookie')}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rookie">Rookie</SelectItem>
                  <SelectItem value="veteran">Vet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {locked ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-[13px]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">This invite</p>
                <dl className="mt-2 space-y-1">
                  {[
                    ['Role', 'Rep'],
                    ['Vertical', profile?.active_vertical || 'Pest'],
                    ['Team', teamName(profile?.team_id || null)],
                    ['Region', profile?.region || 'Not set'],
                    ['Manager', profile?.full_name || 'You'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
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
              <Select value={vertical} onValueChange={setVertical}>
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
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Choose a team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {vertical.toLowerCase() === 'fiber' && (
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
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Choose a manager" /></SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              </>
            )}

            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Who this is for" />
            </div>

            <div>
              <Label>Expires in</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
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
                        {rowStatus(r)} · created {new Date(r.created_at).toLocaleDateString()}
                        {r.used_at
                          ? ` · redeemed by ${names[r.used_by || ''] || 'a new member'} on ${new Date(r.used_at).toLocaleString()}`
                          : ` · expires ${new Date(r.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!r.used_at && !r.revoked_at && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11"
                            onClick={() => copyLink(`${window.location.origin}/invite/${r.token}`)}
                          >
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => revoke(r.id)}>
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
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
