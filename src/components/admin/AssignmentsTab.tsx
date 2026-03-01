import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Search, AlertTriangle, UserX, Users, ArrowRight, Bell, CheckCircle, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'needs_manager' | 'missing_team' | 'not_onboarded' | 'bootcamp_incomplete';

interface UnassignedUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  team_id: string | null;
  team_name: string | null;
  direct_manager: string | null;
  status: string | null;
  onboarding_status: string | null;
  bootcamp_completed: boolean;
  role: string;
  created_at: string | null;
}

interface Props {
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

export default function AssignmentsTab({ managers, teams, onRefresh }: Props) {
  const [users, setUsers] = useState<UnassignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedUser, setSelectedUser] = useState<UnassignedUser | null>(null);
  const [assignManager, setAssignManager] = useState('');
  const [assignTeam, setAssignTeam] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, bootcampRes, rolesRes, teamsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, avatar_url, team_id, direct_manager, status, onboarding_status, created_at').neq('status', 'nlc'),
      supabase.from('bootcamp_progress').select('user_id, bootcamp_completed'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('teams').select('id, name'),
    ]);

    const bootcampMap = new Map((bootcampRes.data || []).map(b => [b.user_id, b.bootcamp_completed]));
    const roleMap = new Map((rolesRes.data || []).map(r => [r.user_id, r.role]));
    const teamMap = new Map((teamsRes.data || []).map(t => [t.id, t.name]));

    const allUsers: UnassignedUser[] = (profilesRes.data || [])
      .filter(p => {
        const r = roleMap.get(p.user_id);
        return r !== 'admin'; // exclude admin from assignment checks
      })
      .map(p => ({
        ...p,
        team_name: p.team_id ? teamMap.get(p.team_id) || null : null,
        bootcamp_completed: roleMap.get(p.user_id) === 'manager' ? true : (bootcampMap.get(p.user_id) ?? false),
        role: roleMap.get(p.user_id) || 'rookie',
      }));

    setUsers(allUsers);
    setLoading(false);
  };

  const filtered = users.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.full_name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
    }
    switch (filter) {
      case 'needs_manager': return !u.direct_manager;
      case 'missing_team': return !u.team_id;
      case 'not_onboarded': return u.onboarding_status !== 'complete';
      case 'bootcamp_incomplete': return !u.bootcamp_completed && u.role === 'rookie';
      default: return !u.direct_manager || !u.team_id; // 'all' shows those needing attention
    }
  });

  const counts = {
    all: users.filter(u => !u.direct_manager || !u.team_id).length,
    needs_manager: users.filter(u => !u.direct_manager).length,
    missing_team: users.filter(u => !u.team_id).length,
    not_onboarded: users.filter(u => u.onboarding_status !== 'complete').length,
    bootcamp_incomplete: users.filter(u => !u.bootcamp_completed && u.role === 'rookie').length,
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    setSaving(true);

    const updates: Record<string, any> = {};
    if (assignManager) updates.direct_manager = assignManager;
    if (assignTeam) updates.team_id = assignTeam;

    if (Object.keys(updates).length > 0) {
      // Update profile
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', selectedUser.user_id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      // If manager was assigned, create edge
      if (assignManager) {
        const managerProfile = managers.find(m => m.full_name === assignManager);
        if (managerProfile) {
          await supabase.from('downline_edges').upsert({
            parent_user_id: managerProfile.user_id,
            child_user_id: selectedUser.user_id,
            edge_type: 'manages',
          }, { onConflict: 'parent_user_id,child_user_id,edge_type' });
        }
      }

      toast({ title: 'Assignment Updated', description: `${selectedUser.full_name} updated.` });
    }

    setSelectedUser(null);
    setAssignManager('');
    setAssignTeam('');
    setSaving(false);
    fetchUsers();
    onRefresh();
  };

  const handleBulkAssignManager = async (managerName: string) => {
    if (selectedIds.size === 0) return;
    const managerProfile = managers.find(m => m.full_name === managerName);
    if (!managerProfile) return;

    // Get the manager's team
    const { data: mgrProfile } = await supabase.from('profiles').select('team_id').eq('user_id', managerProfile.user_id).single();
    
    const ids = Array.from(selectedIds);
    await Promise.all([
      supabase.from('profiles').update({ 
        direct_manager: managerName,
        ...(mgrProfile?.team_id ? { team_id: mgrProfile.team_id } : {}),
      }).in('user_id', ids),
      ...ids.map(uid => 
        supabase.from('downline_edges').upsert({
          parent_user_id: managerProfile.user_id,
          child_user_id: uid,
          edge_type: 'manages',
        }, { onConflict: 'parent_user_id,child_user_id,edge_type' })
      ),
    ]);

    toast({ title: 'Bulk Assignment Complete', description: `${ids.length} users assigned to ${managerName}` });
    setSelectedIds(new Set());
    fetchUsers();
    onRefresh();
  };

  const toggleSelect = (uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const filters: { id: FilterType; label: string; icon: typeof AlertTriangle; count: number }[] = [
    { id: 'all', label: 'Needs Attention', icon: AlertTriangle, count: counts.all },
    { id: 'needs_manager', label: 'Needs Manager', icon: UserX, count: counts.needs_manager },
    { id: 'missing_team', label: 'Missing Team', icon: Users, count: counts.missing_team },
    { id: 'not_onboarded', label: 'Not Onboarded', icon: AlertTriangle, count: counts.not_onboarded },
    { id: 'bootcamp_incomplete', label: 'Checklist Incomplete', icon: AlertTriangle, count: counts.bootcamp_incomplete },
  ];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              filter === f.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <f.icon className="w-3 h-3" />
            {f.label}
            {f.count > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 bg-muted/30 border-border/50" />
        </div>
        {selectedIds.size > 0 && (
          <Select onValueChange={handleBulkAssignManager}>
            <SelectTrigger className="w-56 bg-muted/30 border-border/50 text-xs">
              <SelectValue placeholder={`Assign ${selectedIds.size} to manager...`} />
            </SelectTrigger>
            <SelectContent>
              {managers.map(m => (
                <SelectItem key={m.user_id} value={m.full_name}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">All users are properly assigned</p>
          <p className="text-xs mt-1">No conflicts or missing assignments found</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(filtered.map(u => u.user_id)));
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Manager</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Team</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Issues</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.user_id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.user_id)}
                      onChange={() => toggleSelect(u.user_id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar fullName={u.full_name} avatarUrl={u.avatar_url} size="xs" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-xs truncate" title={u.full_name}>{u.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate" title={u.email}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.direct_manager || <span className="text-destructive font-medium">None</span>}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.team_name || <span className="text-destructive font-medium">None</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {!u.direct_manager && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">No Manager</Badge>}
                      {!u.team_id && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">No Team</Badge>}
                      {u.onboarding_status !== 'complete' && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Not Onboarded</Badge>}
                      {!u.bootcamp_completed && u.role === 'rookie' && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Checklist ✗</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                      setSelectedUser(u);
                      setAssignManager(u.direct_manager || '');
                      setAssignTeam(u.team_id || '');
                    }}>
                      <ArrowRight className="w-3 h-3" /> Assign
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignment Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign — {selectedUser?.full_name}</SheetTitle>
            <SheetDescription>Update team and manager assignments</SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <UserAvatar fullName={selectedUser.full_name} avatarUrl={selectedUser.avatar_url} size="md" />
                <div>
                  <p className="font-semibold text-foreground">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{selectedUser.role}</Badge>
                    <Badge variant={selectedUser.status === 'active' ? 'default' : 'destructive'} className="text-[10px] capitalize">{selectedUser.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Current state */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manager</span>
                  <span className={selectedUser.direct_manager ? 'text-foreground' : 'text-destructive'}>{selectedUser.direct_manager || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team</span>
                  <span className={selectedUser.team_name ? 'text-foreground' : 'text-destructive'}>{selectedUser.team_name || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Onboarding</span>
                  <span className={selectedUser.onboarding_status === 'complete' ? 'text-primary' : 'text-yellow-400'}>{selectedUser.onboarding_status || 'pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Summer Checklist</span>
                  <span className={selectedUser.bootcamp_completed ? 'text-primary' : 'text-destructive'}>{selectedUser.bootcamp_completed ? 'Complete' : 'Incomplete'}</span>
                </div>
              </div>

              {/* Assignment controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Assign Manager</label>
                  <Select value={assignManager || 'none'} onValueChange={(v) => {
                    setAssignManager(v === 'none' ? '' : v);
                    // Auto-set team from manager
                    const mgr = managers.find(m => m.full_name === v);
                    if (mgr) {
                      // We'd need to look up their team, for now just let user pick
                    }
                  }}>
                    <SelectTrigger className="bg-muted/30 border-border/50">
                      <SelectValue placeholder="Select manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managers.map(m => (
                        <SelectItem key={m.user_id} value={m.full_name}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Assign Team</label>
                  <Select value={assignTeam || 'none'} onValueChange={(v) => setAssignTeam(v === 'none' ? '' : v)}>
                    <SelectTrigger className="bg-muted/30 border-border/50">
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAssign} disabled={saving} className="w-full gap-2">
                {saving ? 'Saving...' : 'Save Assignment'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
