import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CreateRepModal } from '@/components/admin/CreateRepModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Search, Shield, CheckCircle, XCircle, Edit2, ChevronUp, ChevronDown, Trash2, Users, Settings, Plus, Play, Eye, Loader2, ArrowUpDown } from 'lucide-react';
import { BootcampDemoWalkthrough } from '@/components/admin/BootcampDemoWalkthrough';
import HierarchySyncTab from '@/components/admin/HierarchySyncTab';
import AdminApplicationsTab from '@/components/admin/AdminApplicationsTab';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { TableSkeleton } from '@/components/admin/AdminTabSkeleton';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import type { UserRow } from '@/components/admin/AdminUsersTab';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRookieView } from '@/contexts/RookieViewContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const LazyFeedback = lazy(() => import('@/components/admin/AdminFeedbackTab'));
const LazyPitchApprovals = lazy(() => import('@/components/admin/AdminPitchApprovalsTab'));

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
  leader_id: string | null;
  member_count: number;
  active_count: number;
  nlc_count: number;
  summer_ready_count: number;
}

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

export default function AdminTeamPage() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const { startImpersonating } = useRookieView();
  const adminCounts = useAdminCounts();
  // Counts are always live — no "viewed" zeroing
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isSuperAdmin = isOwner || profile?.email === SUPER_ADMIN_EMAIL;

  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserRow[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamsSimple, setTeamsSimple] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Edit user state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', direct_manager: '', role: '', status: '', team_id: '', experience: '', bootcamp_exempt: false, onboarding_status: '', region: '', office_name: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState<{ email: string; full_name: string } | null>(null);
  const [customPassword, setCustomPassword] = useState('');

  // Teams
  const [newTeamName, setNewTeamName] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null);
  const [reassignTeamId, setReassignTeamId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, bootcampRes, roleRes, teamsRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, phone, direct_manager, referred_by, status, approved, created_at, team_id, experience, avatar_url, onboarding_status, organization, last_active_at, region, office_name, recruiter').order('created_at', { ascending: false }),
      supabase.from('bootcamp_progress').select('user_id, bootcamp_completed'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('teams').select('id, name, slug, created_at, leader_id').order('name'),
      supabase.from('app_settings').select('key, value'),
    ]);

    const bootcampMap = new Map((bootcampRes.data || []).map(b => [b.user_id, b.bootcamp_completed]));
    const roleMap = new Map((roleRes.data || []).map(r => [r.user_id, r.role]));

    const users: UserRow[] = (profilesRes.data || []).map(p => {
      const userRole = roleMap.get(p.user_id) || 'rookie';
      const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin' || userRole === 'owner';
      return {
        ...p,
        bootcamp_completed: isManagerOrAdmin ? true : (bootcampMap.get(p.user_id) ?? true),
        role: userRole,
      };
    });

    // Pending = signed up via website but not yet approved (no onboarding_status from import)
    const pending = users.filter(r => r.status === 'pending' && !r.approved && !r.onboarding_status);
    const allOthers = users.filter(r => !(r.status === 'pending' && !r.approved && !r.onboarding_status));
    setPendingUsers(pending);
    setAllUsers(allOthers);

    const managerIds = new Set((roleRes.data || []).filter(r => r.role === 'manager' || r.role === 'admin' || r.role === 'owner').map(r => r.user_id));
    const mgrs = (profilesRes.data || []).filter(p => managerIds.has(p.user_id)).map(p => ({ user_id: p.user_id, full_name: p.full_name }));
    setManagers(mgrs);

    const teamsList: TeamRow[] = (teamsRes.data || []).map(t => {
      const members = allOthers.filter(r => r.team_id === t.id);
      return {
        ...t,
        member_count: members.length,
        active_count: members.filter(m => m.status === 'active').length,
        nlc_count: members.filter(m => m.status === 'nlc').length,
        summer_ready_count: members.filter(m => (m.onboarding_status || 'pending') === 'summer_ready').length,
      };
    });
    setTeams(teamsList);
    setTeamsSimple((teamsRes.data || []).map(t => ({ id: t.id, name: t.name })));

    const settingsMap: Record<string, string> = {};
    (settingsRes.data || []).forEach(s => { settingsMap[s.key] = s.value || ''; });
    setSettings(settingsMap);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ============ HANDLERS ============
  const handleApprove = async (userId: string) => {
    const user = pendingUsers.find(u => u.user_id === userId);
    if (user) { setPendingUsers(prev => prev.filter(u => u.user_id !== userId)); setAllUsers(prev => [{ ...user, status: 'active', approved: true }, ...prev]); }
    toast({ title: 'User Approved' });
    try { await supabase.functions.invoke('admin-approve-user', { body: { action: 'approve', user_id: userId } }); fetchData(); } catch (err: any) {
      if (user) { setPendingUsers(prev => [user, ...prev]); setAllUsers(prev => prev.filter(u => u.user_id !== userId)); }
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    const user = pendingUsers.find(u => u.user_id === userId);
    if (user) setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
    toast({ title: 'User Rejected' });
    try { await supabase.functions.invoke('admin-approve-user', { body: { action: 'reject', user_id: userId } }); fetchData(); } catch (err: any) {
      if (user) setPendingUsers(prev => [user, ...prev]);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'nlc' ? 'active' : 'nlc';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('user_id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: newStatus === 'nlc' ? 'Account Deactivated' : 'Account Activated' }); fetchData(); }
  };

  const handlePromoteDemote = async (userId: string, currentRole: string | undefined) => {
    const action = currentRole === 'admin' ? 'demote_admin' : currentRole === 'manager' ? 'promote_admin' : 'update_role';
    const newRole = currentRole === 'admin' ? 'manager' : currentRole === 'manager' ? 'admin' : 'manager';
    try { await supabase.functions.invoke('admin-approve-user', { body: { action: action === 'update_role' ? 'update_role' : action, user_id: userId, role: newRole } }); toast({ title: 'Role Updated' }); fetchData(); } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const deletedUserId = deleteTarget.user_id;
    // Optimistically remove from UI immediately
    setAllUsers(prev => prev.filter(u => u.user_id !== deletedUserId));
    setPendingUsers(prev => prev.filter(u => u.user_id !== deletedUserId));
    setDeleteTarget(null);
    toast({ title: 'User Deleted' });
    try {
      await supabase.functions.invoke('admin-approve-user', { body: { action: 'delete_user', user_id: deletedUserId } });
      // Background refresh to sync any remaining state
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      // Re-fetch to restore accurate state on failure
      fetchData();
    }
  };

  const handleResetPassword = async (email: string, newPassword: string) => {
    try { await supabase.functions.invoke('admin-reset-password', { body: { email, new_password: newPassword } }); toast({ title: 'Password Reset' }); } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const openEditModal = (user: UserRow) => {
    setEditUser(user);
    setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || '', direct_manager: user.direct_manager || '', role: user.role || 'rookie', status: user.status || 'active', team_id: user.team_id || '', experience: user.experience || 'rookie', bootcamp_exempt: false, onboarding_status: user.onboarding_status || 'pending', region: user.region || '', office_name: user.office_name || '' });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    const isManagerRole = editForm.role === 'manager' || editForm.role === 'admin' || editForm.role === 'owner';
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name, email: editForm.email, phone: editForm.phone || null, direct_manager: editForm.direct_manager || null,
      status: editForm.status as any, team_id: editForm.team_id || null,
      experience: (isManagerRole ? 'veteran' : editForm.experience) as any || 'rookie',
      onboarding_status: editForm.onboarding_status || 'pending',
      region: editForm.region || null, office_name: editForm.office_name || null,
    }).eq('user_id', editUser.user_id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setEditLoading(false); return; }
    if (editForm.role !== editUser.role) {
      try { await supabase.functions.invoke('admin-approve-user', { body: { action: 'update_role', user_id: editUser.user_id, role: editForm.role } }); } catch {}
    }
    toast({ title: 'Profile Updated' }); setEditUser(null); setEditLoading(false); fetchData();
  };

  // Team handlers
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const slug = newTeamName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim(), slug });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Team Created' }); setNewTeamName(''); fetchData(); }
  };

  const handleAssignLeader = async (teamId: string, leaderId: string | null) => {
    const { error } = await supabase.from('teams').update({ leader_id: leaderId }).eq('id', teamId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Pillar Leader Updated' }); fetchData(); }
  };

  const handleRenameTeam = async () => {
    if (!editTeam || !editTeamName.trim()) return;
    const { error } = await supabase.from('teams').update({ name: editTeamName.trim() }).eq('id', editTeam.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Team Renamed' }); setEditTeam(null); fetchData(); }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return;
    if (deleteTeam.member_count > 0 && !reassignTeamId) { toast({ title: 'Error', description: 'Reassign members first.', variant: 'destructive' }); return; }
    if (deleteTeam.member_count > 0 && reassignTeamId) {
      await supabase.from('profiles').update({ team_id: reassignTeamId }).eq('team_id', deleteTeam.id);
    }
    const { error } = await supabase.from('teams').delete().eq('id', deleteTeam.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Team Deleted' }); setDeleteTeam(null); setReassignTeamId(''); fetchData(); }
  };

  const handleToggleSetting = async (key: string) => {
    const newVal = settings[key] === 'true' ? 'false' : 'true';
    setSettingsLoading(true);
    const { error } = await supabase.from('app_settings').update({ value: newVal }).eq('key', key);
    if (!error) { setSettings(prev => ({ ...prev, [key]: newVal })); toast({ title: 'Setting Updated' }); }
    setSettingsLoading(false);
  };

  const getTeamName = (teamId: string | null) => teamsSimple.find(t => t.id === teamId)?.name || '—';
  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* ═══ PREMIUM HERO HEADER ═══ */}
        <div className="relative mb-6 -mx-4 px-4 pt-4 pb-5 overflow-hidden rounded-xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,60%,12%)] via-[hsl(225,50%,15%)] to-[hsl(230,40%,10%)] rounded-xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217,80%,30%,0.15),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />

          <div className="relative z-10">
            <PageBackButton to="/app" label="Dashboard" />

            <div className="flex items-start justify-between gap-4 mt-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <Shield className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Admin</h1>
                </div>
                <p className="text-sm text-white/50 mt-1">People management, teams & system controls</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={() => setDemoOpen(true)} className="gap-1.5 bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white font-semibold text-xs h-9 rounded-xl backdrop-blur-sm">
                    <Play className="w-3.5 h-3.5" /> DEMO
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 h-9 rounded-xl shadow-lg shadow-primary/20">
                    <UserPlus className="w-3.5 h-3.5" /> CREATE REP
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue={
          // Auto-navigate to first tab with notifications
          adminCounts.pendingApprovals > 0 ? 'approvals' :
          adminCounts.syncIssues > 0 ? 'sync' :
          adminCounts.pendingPitches > 0 ? 'pitches' :
          adminCounts.newFeedback > 0 ? 'feedback' : 'users'
        } className="w-full">
          <div className="inline-flex items-center rounded-xl bg-card/40 backdrop-blur-sm p-1 border border-border/30 mb-4">
            <TabsList className="bg-transparent p-0 h-auto gap-0.5">
              <TabsTrigger value="users" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Users <span className="ml-1 text-[9px] opacity-70">{allUsers.length}</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Teams <span className="ml-1 text-[9px] opacity-70">{teams.length}</span>
              </TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Approvals {pendingUsers.length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">{pendingUsers.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="apps" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Apps {adminCounts.pendingApplications > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">{adminCounts.pendingApplications}</span>}
              </TabsTrigger>
              <TabsTrigger value="pitches" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Pitches {adminCounts.pendingPitches > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">{adminCounts.pendingPitches}</span>}
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Feedback {adminCounts.newFeedback > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">{adminCounts.newFeedback}</span>}
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="system" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">System</TabsTrigger>
              )}
              <TabsTrigger value="sync" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 transition-all">
                Sync
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========== USERS TAB ========== */}
          <TabsContent value="users">
            {loading ? <TableSkeleton columns={8} rows={8} /> : (
              <AdminUsersTab
                users={allUsers}
                managers={managers}
                teams={teamsSimple}
                isAdmin={isAdmin}
                isSuperAdmin={isSuperAdmin}
                onRefresh={fetchData}
                onEditUser={openEditModal}
                onResetPassword={(email, name) => { setPasswordResetTarget({ email, full_name: name }); setCustomPassword(''); }}
                onToggleStatus={handleToggleStatus}
                onPromoteDemote={handlePromoteDemote}
                onDeleteUser={setDeleteTarget}
                superAdminEmail={SUPER_ADMIN_EMAIL}
              />
            )}
          </TabsContent>

          {/* ========== TEAMS TAB ========== */}
          <TabsContent value="teams">
            {isSuperAdmin && (
              <div className="flex gap-2 mb-4">
                <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="New team name..." className="bg-card/50 border-border/30 max-w-xs" />
                <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()} className="gap-1"><Plus className="w-4 h-4" /> Create Team</Button>
              </div>
            )}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Search teams..." className="pl-9 bg-card/50 border-border/30" />
            </div>
            <div className="border border-border/30 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 bg-card/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Team</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Pillar Leader</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Members</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Active</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Summer Ready</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">NLC</th>
                    {isSuperAdmin && <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map(team => (
                    <tr key={team.id} className="border-b border-border/10 hover:bg-card/20">
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary/60" />{team.name}</td>
                      <td className="px-4 py-3">
                        <Select value={team.leader_id || 'none'} onValueChange={(val) => handleAssignLeader(team.id, val === 'none' ? null : val)}>
                          <SelectTrigger className="w-48 bg-card/50 border-border/30 h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {managers.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 text-center text-foreground font-medium">{team.member_count}</td>
                      <td className="px-3 py-3 text-center text-green-400 font-medium">{team.active_count}</td>
                      <td className="px-3 py-3 text-center text-blue-400 font-medium">{team.summer_ready_count}</td>
                      <td className="px-3 py-3 text-center text-red-400 font-medium">{team.nlc_count}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditTeam(team); setEditTeamName(team.name); }} className="p-1.5 rounded text-foreground/40 hover:text-foreground hover:bg-muted/20" title="Rename"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setDeleteTeam(team); setReassignTeamId(''); }} className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========== APPROVALS TAB ========== */}
          <TabsContent value="approvals">
            {loading ? <TableSkeleton columns={7} rows={3} /> : pendingUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-primary/40" />
                <p className="font-medium">No pending approvals</p>
              </div>
            ) : (
              <div className="border border-border/30 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-card/30">
                      <th className="w-[180px] text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                      <th className="w-[200px] text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Level</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Team</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(user => (
                      <tr key={user.user_id} className="border-b border-border/10 hover:bg-card/20">
                        <td className="px-4 py-3 font-medium text-foreground truncate">{user.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate">{user.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{user.phone || '—'}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{user.role}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{getTeamName(user.team_id)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleApprove(user.user_id)}>
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleReject(user.user_id)}>
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========== APPS TAB ========== */}
          <TabsContent value="apps">
            <AdminApplicationsTab />
          </TabsContent>

          {/* ========== PITCHES TAB ========== */}
          <TabsContent value="pitches">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <LazyPitchApprovals />
            </Suspense>
          </TabsContent>

          {/* ========== FEEDBACK TAB ========== */}
          <TabsContent value="feedback">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <LazyFeedback />
            </Suspense>
          </TabsContent>

          {/* ========== SYSTEM TAB ========== */}
          {isSuperAdmin && (
            <TabsContent value="system">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Global Settings</h2>
                  <div className="border border-border/30 rounded-lg divide-y divide-border/10">
                    {[
                      { key: 'bootcamp_required', label: 'Summer Checklist Required', desc: 'Require rookies to complete Summer Checklist before app access' },
                      { key: 'bootcamp_skip_allowed', label: 'Allow Checklist Skip', desc: 'Show a "Skip for Now" button' },
                      { key: 'approval_required', label: 'Approval Required', desc: 'Require admin approval for new sign-ups' },
                      { key: 'public_signups', label: 'Public Sign-Ups', desc: 'Allow new users to sign up from login page' },
                      { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Disable app for all non-admin users' },
                      { key: 'demo_mode', label: 'Demo Mode', desc: 'Mask sensitive data for presentations' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between px-4 py-4">
                        <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                        <Switch checked={settings[item.key] === 'true'} onCheckedChange={() => handleToggleSetting(item.key)} disabled={settingsLoading} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4">Admin Utilities</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start gap-2 border-border/30 text-foreground/70 hover:text-foreground" onClick={() => {
                      const csv = `Name,Email,Role,Status,Pipeline,Team,Manager\n${allUsers.map(r => `${r.full_name},${r.email},${r.role},${r.status},${r.onboarding_status || 'pending'},${getTeamName(r.team_id)},${r.direct_manager || ''}`).join('\n')}`;
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'users-export.csv'; a.click();
                      toast({ title: 'Users Exported' });
                    }}>Export Users (CSV)</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ========== SYNC TAB ========== */}
          <TabsContent value="sync">
            {loading ? <TableSkeleton columns={4} rows={5} /> : (
              <HierarchySyncTab
                profiles={allUsers.map(u => ({
                  user_id: u.user_id,
                  full_name: u.full_name,
                  email: u.email,
                  direct_manager: u.direct_manager,
                  status: u.status,
                  team_id: u.team_id,
                  avatar_url: u.avatar_url,
                  onboarding_status: u.onboarding_status,
                  recruiter: u.recruiter,
                }))}
                managers={managers}
                teams={teamsSimple}
                onRefresh={fetchData}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <CreateRepModal open={createOpen} onOpenChange={setCreateOpen} managers={managers} teams={teamsSimple} onSuccess={fetchData} />
        <BootcampDemoWalkthrough open={demoOpen} onOpenChange={setDemoOpen} />

        {/* Edit User Modal */}
        <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Edit Profile — {editUser?.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pr-1">
              <div><label className="block text-sm font-medium text-foreground mb-1">Full Name</label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Email</label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Phone</label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Team</label>
                <select className="input-field w-full" value={editForm.team_id} onChange={e => setEditForm(f => ({ ...f, team_id: e.target.value }))}><option value="">None</option>{teamsSimple.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Assigned Manager</label>
                <select className="input-field w-full" value={editForm.direct_manager} onChange={e => setEditForm(f => ({ ...f, direct_manager: e.target.value }))}><option value="">None</option>{managers.map(m => <option key={m.user_id} value={m.full_name}>{m.full_name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select className="input-field w-full" value={editForm.role} onChange={e => { const r = e.target.value; setEditForm(f => ({ ...f, role: r, experience: r === 'manager' || r === 'admin' || r === 'owner' ? 'veteran' : f.experience })); }}><option value="rookie">Rookie</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              {editForm.role === 'rookie' && (
                <div><label className="block text-sm font-medium text-foreground mb-1">Experience Level</label>
                  <select className="input-field w-full" value={editForm.experience} onChange={e => setEditForm(f => ({ ...f, experience: e.target.value }))}><option value="rookie">Rookie</option><option value="veteran">Veteran</option></select></div>
              )}
              <div><label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select className="input-field w-full" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="nlc">Disabled (NLC)</option></select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Progress Status</label>
                <select className="input-field w-full" value={editForm.onboarding_status} onChange={e => setEditForm(f => ({ ...f, onboarding_status: e.target.value }))}>
                  <option value="pending">Prospect Added</option>
                  <option value="contract_signed">Contract Signed</option>
                  <option value="info_added">Info Added</option>
                  <option value="onboarded">Onboarded</option>
                  <option value="summer_ready">Summer Ready</option>
                </select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Region</label>
                <Input value={editForm.region} onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Phoenix, Boston" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Office</label>
                <Input value={editForm.office_name} onChange={e => setEditForm(f => ({ ...f, office_name: e.target.value }))} placeholder="Office name" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password */}
        <Dialog open={!!passwordResetTarget} onOpenChange={(open) => !open && setPasswordResetTarget(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Set a new password for <strong>{passwordResetTarget?.full_name}</strong></p>
            <div className="space-y-4 mt-2">
              <Input type="password" placeholder="New password (min 6 characters)" value={customPassword} onChange={e => setCustomPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && customPassword.length >= 6 && handleResetPassword(passwordResetTarget!.email, customPassword) && setPasswordResetTarget(null)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPasswordResetTarget(null)}>Cancel</Button>
                <Button onClick={async () => { await handleResetPassword(passwordResetTarget!.email, customPassword); setPasswordResetTarget(null); setCustomPassword(''); }} disabled={customPassword.length < 6}>Set Password</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete User?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Are you sure you want to permanently delete <strong className="text-foreground">{deleteTarget?.full_name}</strong>?</p>
                  <p>Consider marking them as <strong className="text-foreground">'Inactive'</strong> instead.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteTarget) { handleToggleStatus(deleteTarget.user_id, deleteTarget.status === 'nlc' ? 'nlc' : 'active'); setDeleteTarget(null); } }} className="bg-amber-600 text-white hover:bg-amber-700">Mark Inactive</AlertDialogAction>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Permanently Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename Team */}
        <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Rename Team</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Input value={editTeamName} onChange={e => setEditTeamName(e.target.value)} />
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button><Button onClick={handleRenameTeam}>Save</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Team */}
        <AlertDialog open={!!deleteTeam} onOpenChange={(open) => !open && setDeleteTeam(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team: {deleteTeam?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTeam && deleteTeam.member_count > 0 ? (
                  <>This team has {deleteTeam.member_count} member(s). Reassign them first:<br />
                    <select className="input-field w-full mt-2" value={reassignTeamId} onChange={e => setReassignTeamId(e.target.value)}>
                      <option value="">Select team to reassign to...</option>
                      {teamsSimple.filter(t => t.id !== deleteTeam?.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </>
                ) : 'This will permanently delete this team.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Team</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
