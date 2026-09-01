import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  status: 'Sent' | 'Opened' | 'Joined' | 'Revoked';
  first_name: string | null;
  last_name: string | null;
  vertical: string | null;
  team_name: string | null;
  created_at: string;
  expires_at: string;
  inviter_name?: string | null;
  joined_name?: string | null;
};

interface InviteDialogProps {
  /** Kept for the existing call sites. Managers always invite into their own workspace. */
  managerLocked?: boolean;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary';
}

const VERTICALS = ['Pest', 'Fiber', 'Life'];

export function InviteDialog({ triggerLabel = 'Invite', triggerVariant = 'outline' }: InviteDialogProps) {
  const { role } = useAuth();
  const { activeVertical } = useWorkspace();
  const isStaff = role === 'admin' || role === 'owner';

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [vertical, setVertical] = useState<string>(activeVertical || 'Pest');
  const [teamId, setTeamId] = useState<string>('');
  const [link, setLink] = useState<string | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<InviteRow[]>([]);

  const loadRows = useCallback(async () => {
    const { data } = await (supabase as any).rpc(isStaff ? 'all_invites' : 'my_invites');
    setRows(((data as InviteRow[]) || []).filter(Boolean));
  }, [isStaff]);

  useEffect(() => {
    if (!open) return;
    setVertical(activeVertical || 'Pest');
    (async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
      loadRows();
    })();
  }, [open, activeVertical, loadRows]);

  const create = async () => {
    if (!firstName.trim()) {
      toast.error('A first name is needed');
      return;
    }
    setSaving(true);
    setLink(null);
    const { data, error } = await (supabase as any).rpc('create_invite', {
      _first_name: firstName.trim(),
      _last_name: lastName.trim() || null,
      _phone: phone.trim() || null,
      _vertical: vertical,
      _team_id: teamId || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not create the invite', { description: error.message });
      return;
    }
    const token = (data as { token?: string } | null)?.token;
    if (!token) {
      toast.error('Could not create the invite');
      return;
    }
    setLink(`${window.location.origin}/invite/${token}`);
    setLastName('');
    setPhone('');
    loadRows();
  };

  const revoke = async (id: string) => {
    const { error } = await (supabase as any).rpc('revoke_invite', { _id: id });
    if (error) {
      toast.error('Could not revoke that invite');
      return;
    }
    loadRows();
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const shareLink = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Summit invite', text: `Here is your Summit invite: ${url}`, url });
        return;
      } catch {
        return;
      }
    }
    await copyLink(url);
  };

  const chipTone = (status: InviteRow['status']) =>
    status === 'Joined'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : status === 'Revoked'
        ? 'border-border bg-muted/40 text-muted-foreground'
        : 'border-border bg-surface text-foreground';

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setLink(null); setFirstName(''); } }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="min-h-11">
          <UserPlus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite by link</DialogTitle>
          <DialogDescription>
            This makes a single use link. You send it yourself, we send no text message. Whoever
            opens it joins your workspace and still waits for approval.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Invite link</p>
              <p className="mt-2 break-all text-base font-semibold leading-snug text-foreground">{link}</p>
              <p className="mt-2 text-xs text-muted-foreground">Single use, good for 7 days</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11 flex-1" onClick={() => shareLink(link)}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => copyLink(link)}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setLink(null)}>
                Invite someone else
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="invite-first">First name</Label>
                <Input
                  id="invite-first"
                  className="min-h-11"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-last">Last name (optional)</Label>
                <Input
                  id="invite-last"
                  className="min-h-11"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invite-phone">Phone</Label>
              <Input
                id="invite-phone"
                type="tel"
                className="min-h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <Label>Workspace</Label>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team (optional)</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="No team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
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
          <p className="text-sm font-medium text-foreground">{isStaff ? 'All invites' : 'Your invites'}</p>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">
                        {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'No name'}
                        {r.vertical ? ` · ${r.vertical}` : ''}
                        {r.team_name ? ` · ${r.team_name}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.inviter_name ? `From ${r.inviter_name} · ` : ''}
                        {r.status === 'Joined'
                          ? `Joined as ${r.joined_name || 'a new member'}`
                          : `Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipTone(r.status)}`}>
                        {r.status}
                      </span>
                      {(r.status === 'Sent' || r.status === 'Opened') && (
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
