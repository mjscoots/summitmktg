import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateRepModal } from '@/components/admin/CreateRepModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Search, RotateCcw, Shield, CheckCircle, XCircle, Edit2, ChevronUp, ChevronDown, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RepRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  direct_manager: string | null;
  referred_by: string | null;
  status: string | null;
  approved: boolean | null;
  created_at: string | null;
  bootcamp_completed: boolean;
  role?: string;
}

export default function AdminTeamPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [reps, setReps] = useState<RepRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<RepRow[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<RepRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', direct_manager: '', role: '', status: '' });
  const [editLoading, setEditLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, phone, direct_manager, referred_by, status, approved, created_at')
      .order('created_at', { ascending: false });

    const { data: bootcampData } = await supabase
      .from('bootcamp_progress')
      .select('user_id, bootcamp_completed');

    const bootcampMap = new Map(
      (bootcampData || []).map(b => [b.user_id, b.bootcamp_completed])
    );

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map((roleData || []).map(r => [r.user_id, r.role]));
    const managerIds = new Set((roleData || []).filter(r => r.role === 'manager' || r.role === 'admin').map(r => r.user_id));

    const allReps: RepRow[] = (profiles || []).map(p => ({
      ...p,
      bootcamp_completed: bootcampMap.get(p.user_id) ?? true,
      role: roleMap.get(p.user_id) || 'rookie',
    }));

    const pending = allReps.filter(r => r.status === 'pending' && !r.approved);
    const approved = allReps.filter(r => r.status !== 'pending' || r.approved);

    setPendingUsers(pending);
    setReps(approved);

    const mgrs = (profiles || [])
      .filter(p => managerIds.has(p.user_id))
      .map(p => ({ user_id: p.user_id, full_name: p.full_name }));
    setManagers(mgrs);

    const { data: teamsData } = await supabase.from('teams').select('id, name');
    setTeams(teamsData || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', {
        body: { action: 'approve', user_id: userId },
      });
      if (error) throw error;
      toast({ title: 'User Approved', description: 'User has been approved and notified.' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', {
        body: { action: 'reject', user_id: userId },
      });
      if (error) throw error;
      toast({ title: 'User Rejected' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email, new_password: 'summit2026' },
      });
      if (error) throw error;
      toast({ title: 'Password Reset', description: `Password for ${email} reset to default.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'nlc' ? 'active' : 'nlc';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newStatus === 'nlc' ? 'Account Deactivated' : 'Account Activated' });
      fetchData();
    }
  };

  const handlePromoteDemote = async (userId: string, currentRole: string | undefined) => {
    const action = currentRole === 'admin' ? 'demote_admin' : currentRole === 'manager' ? 'promote_admin' : 'update_role';
    const newRole = currentRole === 'admin' ? 'manager' : currentRole === 'manager' ? 'admin' : 'manager';

    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', {
        body: { action: action === 'update_role' ? 'update_role' : action, user_id: userId, role: newRole },
      });
      if (error) throw error;
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditModal = (rep: RepRow) => {
    setEditUser(rep);
    setEditForm({
      full_name: rep.full_name,
      phone: rep.phone || '',
      direct_manager: rep.direct_manager || '',
      role: rep.role || 'rookie',
      status: rep.status || 'active',
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);

    // Update profile fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        direct_manager: editForm.direct_manager || null,
        status: editForm.status as any,
      })
      .eq('user_id', editUser.user_id);

    if (profileError) {
      toast({ title: 'Error', description: profileError.message, variant: 'destructive' });
      setEditLoading(false);
      return;
    }

    // Update role if changed
    if (editForm.role !== editUser.role) {
      try {
        await supabase.functions.invoke('admin-approve-user', {
          body: { action: 'update_role', user_id: editUser.user_id, role: editForm.role },
        });
      } catch (err: any) {
        console.error('Role update error:', err);
      }
    }

    toast({ title: 'Profile Updated' });
    setEditUser(null);
    setEditLoading(false);
    fetchData();
  };

  const handleSendResetEmail = async (email: string, fullName: string) => {
    try {
      // Reset password to temp
      await supabase.functions.invoke('admin-reset-password', {
        body: { email, new_password: 'summit2026' },
      });

      // Mark password_changed as false so they're forced to change
      await supabase
        .from('profiles')
        .update({ password_changed: false })
        .eq('email', email);

      toast({ title: 'Password Reset & Email Sent', description: `${fullName} will need to change password on next login.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = reps.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string | null) => {
    if (status === 'nlc') return <Badge variant="destructive" className="text-[10px]">Disabled</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
    if (status === 'pending') return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
    return <Badge variant="outline" className="text-[10px]">Active</Badge>;
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-black text-foreground tracking-tight">Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage approvals, users, and permissions</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-white text-black hover:bg-white/90 font-black">
              <UserPlus className="w-4 h-4" />
              CREATE REP ACCOUNT
            </Button>
          )}
        </div>

        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-4">
            <TabsTrigger value="approvals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Approvals {pendingUsers.length > 0 && <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Users
            </TabsTrigger>
          </TabsList>

          {/* APPROVALS TAB */}
          <TabsContent value="approvals">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-primary/40" />
                <p className="font-medium">No pending approvals</p>
                <p className="text-sm mt-1">All sign-ups have been processed.</p>
              </div>
            ) : (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Phone</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Level</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Manager</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Referred By</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Date</th>
                        <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(user => (
                        <tr key={user.user_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium text-white">{user.full_name}</td>
                          <td className="px-4 py-3 text-white/60">{user.email}</td>
                          <td className="px-4 py-3 text-white/60">{user.phone || '—'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px] capitalize">{user.role}</Badge>
                          </td>
                          <td className="px-4 py-3 text-white/60">{user.direct_manager || '—'}</td>
                          <td className="px-4 py-3 text-white/60">{user.referred_by || '—'}</td>
                          <td className="px-4 py-3 text-white/40 text-xs">
                            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                                onClick={() => handleApprove(user.user_id)}>
                                <CheckCircle className="w-3 h-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={() => handleReject(user.user_id)}>
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 bg-white/5 border-white/10" />
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Boot Camp</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Manager</th>
                        <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Referred By</th>
                        {isAdmin && <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(rep => (
                        <tr key={rep.user_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{rep.full_name}</td>
                          <td className="px-4 py-3 text-white/60">{rep.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] capitalize">{rep.role}</Badge>
                          </td>
                          <td className="px-4 py-3">{statusBadge(rep.status)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={rep.bootcamp_completed ? 'default' : 'destructive'} className="text-[10px]">
                              {rep.bootcamp_completed ? 'Complete' : 'Incomplete'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-white/60">{rep.direct_manager || '—'}</td>
                          <td className="px-4 py-3 text-white/60">{rep.referred_by || '—'}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditModal(rep)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5" title="Edit Profile">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleResetPassword(rep.email)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5" title="Reset Password">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleSendResetEmail(rep.email, rep.full_name)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5" title="Reset & Email Instructions">
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(rep.user_id, rep.status)}
                                  className={`p-1.5 rounded text-xs font-medium ${rep.status === 'nlc' ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`}
                                  title={rep.status === 'nlc' ? 'Activate' : 'Deactivate'}
                                >
                                  {rep.status === 'nlc' ? 'Activate' : 'Disable'}
                                </button>
                                {rep.role !== 'admin' && (
                                  <button onClick={() => handlePromoteDemote(rep.user_id, rep.role)} className="p-1.5 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="Promote">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {rep.role === 'admin' && rep.email !== 'mjscoots9@gmail.com' && (
                                  <button onClick={() => handlePromoteDemote(rep.user_id, rep.role)} className="p-1.5 rounded text-orange-400/60 hover:text-orange-400 hover:bg-orange-400/5" title="Demote">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-white/30">No members found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Rep Modal */}
        <CreateRepModal open={createOpen} onOpenChange={setCreateOpen} managers={managers} teams={teams} onSuccess={fetchData} />

        {/* Edit User Modal */}
        <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Edit Profile — {editUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Assigned Manager</label>
                <select className="input-field w-full" value={editForm.direct_manager} onChange={e => setEditForm(f => ({ ...f, direct_manager: e.target.value }))}>
                  <option value="">None</option>
                  {managers.map(m => <option key={m.user_id} value={m.full_name}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select className="input-field w-full" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="rookie">Rookie</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select className="input-field w-full" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="nlc">Disabled (NLC)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={editLoading} className="bg-white text-black hover:bg-white/90">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
