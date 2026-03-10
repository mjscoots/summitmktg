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
import { UserPlus, Search, RotateCcw, Shield, CheckCircle, XCircle, Edit2, ChevronUp, ChevronDown, Mail, Trash2, Users, Settings, Plus, Play, Download, FileText, Eye, ClipboardList, Book, Loader2, RefreshCw, Upload, Mic, MessageSquareText, AlertTriangle, Video, ArrowUpDown } from 'lucide-react';
import { BootcampDemoWalkthrough } from '@/components/admin/BootcampDemoWalkthrough';
import AdminApplicationsTab from '@/components/admin/AdminApplicationsTab';
const LazyAssignments = lazy(() => import('@/components/admin/AssignmentsTab'));

import { TableSkeleton, CardsSkeleton } from '@/components/admin/AdminTabSkeleton';
const LazyTrainingCMS = lazy(() => import('@/pages/app/AdminTrainingEditor').then(m => ({ default: m.TrainingCMSContent })));
const LazyRosterStatus = lazy(() => import('@/components/admin/RosterStatusView'));
const LazyMassImport = lazy(() => import('@/components/admin/MassImportTab'));
const LazyFeedback = lazy(() => import('@/components/admin/AdminFeedbackTab'));
const LazySubmittedVideos = lazy(() => import('@/components/admin/AdminSubmittedVideosTab'));
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRookieView } from '@/contexts/RookieViewContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  team_id: string | null;
  bootcamp_completed: boolean;
  role?: string;
  experience?: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
  leader_id: string | null;
  member_count: number;
}

interface BootcampRow {
  user_id: string;
  full_name: string;
  email: string;
  team_name: string;
  phase_1_complete: boolean;
  phase_2_complete: boolean;
  phase_3_complete: boolean;
  bootcamp_completed: boolean;
  bootcamp_completed_at: string | null;
  sunblock_video_url: string | null;
  motivation_video_url: string | null;
  final_commitment_video_url: string | null;
  agreement_start_date: string | null;
  agreement_end_date: string | null;
  signature_name: string | null;
  signature_data: string | null;
}

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

export default function AdminTeamPage() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const { startImpersonating } = useRookieView();
  const adminCounts = useAdminCounts();
  useEffect(() => { adminCounts.markViewed('pendingApprovals'); }, []);
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isSuperAdmin = isOwner || profile?.email === SUPER_ADMIN_EMAIL;
  const [reps, setReps] = useState<RepRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<RepRow[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamsSimple, setTeamsSimple] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<RepRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', direct_manager: '', role: '', status: '', team_id: '', experience: '', bootcamp_exempt: false });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RepRow | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null);
  const [reassignTeamId, setReassignTeamId] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [rosterSubTab, setRosterSubTab] = useState<'sync' | 'import' | 'assign'>('sync');
  const [passwordResetTarget, setPasswordResetTarget] = useState<{ email: string; full_name: string } | null>(null);
  const [customPassword, setCustomPassword] = useState('');

  // Bootcamp responses state
  const [bootcampData, setBootcampData] = useState<BootcampRow[]>([]);
  const [bootcampSearch, setBootcampSearch] = useState('');
  const [bootcampTeamFilter, setBootcampTeamFilter] = useState('all');
  const [bootcampStatusFilter, setBootcampStatusFilter] = useState('all');
  const [bootcampDetail, setBootcampDetail] = useState<BootcampRow | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  // Sort direction
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchData = async () => {
    setLoading(true);

    const [profilesRes, bootcampRes, roleRes, teamsRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, phone, direct_manager, referred_by, status, approved, created_at, team_id, experience, avatar_url, onboarding_status').order('created_at', { ascending: false }),
      supabase.from('bootcamp_progress').select('*'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('teams').select('id, name, slug, created_at, leader_id').order('name'),
      supabase.from('app_settings').select('key, value'),
    ]);

    const bootcampMap = new Map((bootcampRes.data || []).map(b => [b.user_id, b]));
    const roleMap = new Map((roleRes.data || []).map(r => [r.user_id, r.role]));
    const managerIds = new Set((roleRes.data || []).filter(r => r.role === 'manager' || r.role === 'admin').map(r => r.user_id));
    const teamsMap = new Map((teamsRes.data || []).map(t => [t.id, t.name]));

    const allReps: RepRow[] = (profilesRes.data || []).map(p => {
      const userRole = roleMap.get(p.user_id) || 'rookie';
      const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';
      return {
        ...p,
        bootcamp_completed: isManagerOrAdmin ? true : (bootcampMap.get(p.user_id)?.bootcamp_completed ?? true),
        role: userRole,
      };
    });

    const pending = allReps.filter(r => r.status === 'pending' && !r.approved);
    const approved = allReps.filter(r => r.status !== 'pending' || r.approved);
    setPendingUsers(pending);
    setReps(approved);

    const mgrs = (profilesRes.data || []).filter(p => managerIds.has(p.user_id)).map(p => ({ user_id: p.user_id, full_name: p.full_name }));
    setManagers(mgrs);

    const teamsList = (teamsRes.data || []).map(t => ({
      ...t,
      member_count: allReps.filter(r => r.team_id === t.id).length,
    }));
    setTeams(teamsList);
    setTeamsSimple((teamsRes.data || []).map(t => ({ id: t.id, name: t.name })));

    const settingsMap: Record<string, string> = {};
    (settingsRes.data || []).forEach(s => { settingsMap[s.key] = s.value || ''; });
    setSettings(settingsMap);

    // Build bootcamp responses data
    const bcRows: BootcampRow[] = (profilesRes.data || [])
      .filter(p => {
        const userRole = roleMap.get(p.user_id) || 'rookie';
        return userRole === 'rookie';
      })
      .map(p => {
        const bc = bootcampMap.get(p.user_id);
        if (!bc) return null;
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          team_name: p.team_id ? (teamsMap.get(p.team_id) || '—') : '—',
          phase_1_complete: bc.phase_1_complete,
          phase_2_complete: bc.phase_2_complete,
          phase_3_complete: bc.phase_3_complete,
          bootcamp_completed: bc.bootcamp_completed,
          bootcamp_completed_at: bc.bootcamp_completed_at,
          sunblock_video_url: (bc as any).sunblock_video_url || null,
          motivation_video_url: (bc as any).motivation_video_url || bc.phase_2_video_url || null,
          final_commitment_video_url: (bc as any).final_commitment_video_url || bc.phase_3_video_url || null,
          agreement_start_date: (bc as any).agreement_start_date || bc.commitment_start_date || null,
          agreement_end_date: (bc as any).agreement_end_date || bc.commitment_end_date || null,
          signature_name: bc.signature_name,
          signature_data: bc.signature_data,
        } as BootcampRow;
      })
      .filter(Boolean) as BootcampRow[];
    setBootcampData(bcRows);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getVideoUrl = async (path: string): Promise<string | null> => {
    if (videoUrls[path]) return videoUrls[path];
    const { data } = await supabase.storage.from('bootcamp-videos').createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setVideoUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  // ============ APPROVAL HANDLERS ============
  const handleApprove = async (userId: string) => {
    const approvedUser = pendingUsers.find(u => u.user_id === userId);
    if (approvedUser) {
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
      setReps(prev => [{ ...approvedUser, status: 'active', approved: true }, ...prev]);
    }
    toast({ title: 'User Approved' });
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', { body: { action: 'approve', user_id: userId } });
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      if (approvedUser) {
        setPendingUsers(prev => [approvedUser, ...prev]);
        setReps(prev => prev.filter(u => u.user_id !== userId));
      }
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    const rejectedUser = pendingUsers.find(u => u.user_id === userId);
    if (rejectedUser) {
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
    }
    toast({ title: 'User Rejected' });
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', { body: { action: 'reject', user_id: userId } });
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      if (rejectedUser) {
        setPendingUsers(prev => [rejectedUser, ...prev]);
      }
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ============ USER HANDLERS ============
  const handleResetPassword = async (email: string, newPassword: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', { body: { email, new_password: newPassword } });
      if (error) throw error;
      toast({ title: 'Password Reset', description: `Password updated successfully.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'nlc' ? 'active' : 'nlc';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('user_id', userId);
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
      const { error } = await supabase.functions.invoke('admin-approve-user', { body: { action: action === 'update_role' ? 'update_role' : action, user_id: userId, role: newRole } });
      if (error) throw error;
      toast({ title: 'Role Updated', description: `Role changed to ${newRole}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', { body: { action: 'delete_user', user_id: deleteTarget.user_id } });
      if (error) throw error;
      toast({ title: 'User Deleted', description: `${deleteTarget.full_name} has been permanently deleted.` });
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openPasswordResetDialog = (email: string, fullName: string) => {
    setPasswordResetTarget({ email, full_name: fullName });
    setCustomPassword('');
  };

  const handleConfirmPasswordReset = async () => {
    if (!passwordResetTarget || !customPassword) return;
    if (customPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    await handleResetPassword(passwordResetTarget.email, customPassword);
    setPasswordResetTarget(null);
    setCustomPassword('');
  };

  const openEditModal = (rep: RepRow) => {
    setEditUser(rep);
    setEditForm({
      full_name: rep.full_name,
      phone: rep.phone || '',
      direct_manager: rep.direct_manager || '',
      role: rep.role || 'rookie',
      status: rep.status || 'active',
      team_id: rep.team_id || '',
      experience: rep.experience || 'rookie',
      bootcamp_exempt: false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    const isManagerRole = editForm.role === 'manager' || editForm.role === 'admin';
    const { error: profileError } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      phone: editForm.phone || null,
      direct_manager: editForm.direct_manager || null,
      status: editForm.status as any,
      team_id: editForm.team_id || null,
      experience: (isManagerRole ? 'veteran' : editForm.experience) as any || 'rookie',
    }).eq('user_id', editUser.user_id);

    if (profileError) {
      toast({ title: 'Error', description: profileError.message, variant: 'destructive' });
      setEditLoading(false);
      return;
    }

    if (editForm.role !== editUser.role) {
      try {
        await supabase.functions.invoke('admin-approve-user', { body: { action: 'update_role', user_id: editUser.user_id, role: editForm.role } });
      } catch (err: any) {
        console.error('Role update error:', err);
      }
    }

    toast({ title: 'Profile Updated' });
    setEditUser(null);
    setEditLoading(false);
    fetchData();
  };

  // ============ TEAM HANDLERS ============
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const slug = newTeamName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim(), slug });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team Created' });
      setNewTeamName('');
      fetchData();
    }
  };

  const handleAssignLeader = async (teamId: string, leaderId: string | null) => {
    const { error } = await supabase.from('teams').update({ leader_id: leaderId }).eq('id', teamId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pillar Leader Updated' });
      fetchData();
    }
  };

  const handleRenameTeam = async () => {
    if (!editTeam || !editTeamName.trim()) return;
    const { error } = await supabase.from('teams').update({ name: editTeamName.trim() }).eq('id', editTeam.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team Renamed' });
      setEditTeam(null);
      fetchData();
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return;
    if (deleteTeam.member_count > 0 && !reassignTeamId) {
      toast({ title: 'Error', description: 'Reassign members before deleting.', variant: 'destructive' });
      return;
    }
    if (deleteTeam.member_count > 0 && reassignTeamId) {
      await supabase.from('profiles').update({ team_id: reassignTeamId }).eq('team_id', deleteTeam.id);
    }
    const { error } = await supabase.from('teams').delete().eq('id', deleteTeam.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team Deleted' });
      setDeleteTeam(null);
      setReassignTeamId('');
      fetchData();
    }
  };

  // ============ SETTINGS HANDLERS ============
  const handleToggleSetting = async (key: string) => {
    const newVal = settings[key] === 'true' ? 'false' : 'true';
    setSettingsLoading(true);
    const { error } = await supabase.from('app_settings').update({ value: newVal }).eq('key', key);
    if (!error) {
      setSettings(prev => ({ ...prev, [key]: newVal }));
      toast({ title: 'Setting Updated' });
    }
    setSettingsLoading(false);
  };

  const [userSort, setUserSort] = useState<'alpha' | 'latest' | 'team' | 'role' | 'bootcamp'>('alpha');

  const filtered = reps.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (userSort) {
      case 'latest': return dir * (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'team': return dir * (getTeamName(a.team_id)).localeCompare(getTeamName(b.team_id));
      case 'role': return dir * (a.role || 'rookie').localeCompare(b.role || 'rookie');
      case 'bootcamp': {
        if (a.bootcamp_completed === b.bootcamp_completed) return dir * a.full_name.localeCompare(b.full_name);
        return dir * (a.bootcamp_completed ? 1 : -1);
      }
      default: return dir * a.full_name.localeCompare(b.full_name);
    }
  });

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const filteredBootcamp = bootcampData.filter(b => {
    if (bootcampSearch && !b.full_name.toLowerCase().includes(bootcampSearch.toLowerCase()) && !b.email.toLowerCase().includes(bootcampSearch.toLowerCase())) return false;
    if (bootcampTeamFilter !== 'all' && b.team_name !== bootcampTeamFilter) return false;
    if (bootcampStatusFilter === 'complete' && !b.bootcamp_completed) return false;
    if (bootcampStatusFilter === 'incomplete' && b.bootcamp_completed) return false;
    return true;
  });

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '—';
    return teamsSimple.find(t => t.id === teamId)?.name || '—';
  };

  const statusBadge = (status: string | null) => {
    if (status === 'nlc') return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 leading-tight whitespace-nowrap">Disabled</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 leading-tight whitespace-nowrap">Rejected</Badge>;
    if (status === 'pending') return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 leading-tight whitespace-nowrap">Pending</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 leading-tight whitespace-nowrap">Active</Badge>;
  };

  const openVideoInNewTab = async (path: string | null) => {
    if (!path) return;
    const url = await getVideoUrl(path);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Error', description: 'Could not load video', variant: 'destructive' });
  };

  const uniqueTeamNames = [...new Set(bootcampData.map(b => b.team_name).filter(t => t !== '—'))];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-black text-foreground tracking-tight">Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage approvals, users, teams & system</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setDemoOpen(true)} className="gap-1.5 bg-transparent border border-primary/30 text-primary hover:bg-primary/10 font-semibold text-xs">
                <Play className="w-3.5 h-3.5" /> DEMO
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-transparent border border-border text-foreground hover:bg-white/5 font-semibold text-xs">
                <UserPlus className="w-3.5 h-3.5" /> CREATE REP
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="approvals" className="w-full" onValueChange={(tab) => {
          const tabToKey: Record<string, 'pendingApprovals' | 'pendingApplications' | 'pendingPitches' | 'newFeedback'> = {
            approvals: 'pendingApprovals',
            applications: 'pendingApplications',
            pitches: 'pendingPitches',
            feedback: 'newFeedback',
          };
          if (tabToKey[tab]) adminCounts.markViewed(tabToKey[tab]);
        }}>
          <TabsList className="bg-white/5 border border-white/10 mb-4 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="approvals" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Approvals {pendingUsers.length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1 py-0.5 rounded-full font-bold">{pendingUsers.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="users" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Users <span className="ml-1 text-[9px] text-muted-foreground">{reps.length}</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Apps {adminCounts.pendingApplications > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1 py-0.5 rounded-full font-bold">{adminCounts.pendingApplications}</span>}
            </TabsTrigger>
            <TabsTrigger value="pitches" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pitches {adminCounts.pendingPitches > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1 py-0.5 rounded-full font-bold">{adminCounts.pendingPitches}</span>}
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Teams <span className="ml-1 text-[9px] text-muted-foreground">{teams.length}</span>
            </TabsTrigger>
            <TabsTrigger value="roster" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Roster & Assign
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="system" className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">System</TabsTrigger>
            )}
          </TabsList>

          {/* ========== APPLICATIONS TAB ========== */}
          <TabsContent value="applications">
            <AdminApplicationsTab />
          </TabsContent>

          {/* ========== PITCH APPROVALS TAB ========== */}
          <TabsContent value="pitches">
            <div className="text-sm text-muted-foreground mb-3">
              Manage pending pitch approval requests from reps.
            </div>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 mb-4" onClick={() => navigate('/app/pitch-approvals')}>
              <Mic className="w-3.5 h-3.5" /> Open Pitch Approvals Page
            </Button>
          </TabsContent>

          <TabsContent value="approvals">
            {loading ? (
              <TableSkeleton columns={7} rows={3} />
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-primary/40" />
                <p className="font-medium">No pending approvals</p>
              </div>
            ) : (
              <div className="border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="w-[140px] sm:w-[180px] text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                      <th className="w-[170px] sm:w-[220px] text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Level</th>
                      <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Team</th>
                      <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(user => (
                      <tr key={user.user_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-white max-w-[140px] sm:max-w-[180px] truncate" title={user.full_name}>{user.full_name}</td>
                        <td className="px-4 py-3 text-white/60 max-w-[170px] sm:max-w-[220px] truncate" title={user.email}>{user.email}</td>
                        <td className="px-4 py-3 text-white/60">{user.phone || '—'}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{user.role}</Badge></td>
                        <td className="px-4 py-3 text-white/60">{getTeamName(user.team_id)}</td>
                        <td className="px-4 py-3 text-white/40 text-xs">{user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}</td>
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

          {/* ========== USERS TAB ========== */}
          <TabsContent value="users">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 bg-white/5 border-white/10" />
              </div>
              <Select value={userSort} onValueChange={(v) => setUserSort(v as any)}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-xs">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="bootcamp">Checklist</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2 border-white/10 text-muted-foreground hover:text-foreground"
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">{sortDirection === 'asc' ? 'A→Z' : 'Z→A'}</span>
              </Button>
            </div>

            {loading ? (
              <TableSkeleton columns={7} rows={8} />
            ) : (
              <div className="border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="w-[130px] sm:w-[170px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                      <th className="w-[150px] sm:w-[200px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                      <th className="w-[60px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Role</th>
                      <th className="w-[60px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                      <th className="w-[80px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Team</th>
                      <th className="w-[70px] text-left px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Checklist</th>
                      {isAdmin && <th className="w-[120px] text-right px-3 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(rep => (
                      <tr key={rep.user_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 font-medium text-white truncate" title={rep.full_name}>{rep.full_name}</td>
                        <td className="px-3 py-2.5 text-white/60 truncate" title={rep.email}>{rep.email}</td>
                        <td className="px-3 py-2.5"><Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize leading-tight">{rep.role}</Badge></td>
                        <td className="px-3 py-2.5">{statusBadge(rep.status)}</td>
                        <td className="px-3 py-2.5 text-white/60 text-xs truncate" title={getTeamName(rep.team_id)}>{getTeamName(rep.team_id)}</td>
                        <td className="px-3 py-2.5">
                          {rep.role === 'manager' || rep.role === 'admin' ? (
                            <span className="text-muted-foreground text-[9px] font-medium">N/A</span>
                          ) : (
                            <Badge variant={rep.bootcamp_completed ? 'default' : 'destructive'} className="text-[9px] px-1.5 py-0 leading-tight whitespace-nowrap">
                              {rep.bootcamp_completed ? '✓' : '✗'}
                            </Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => { startImpersonating({ user_id: rep.user_id, full_name: rep.full_name, email: rep.email }); navigate('/app/rookie'); }} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="View as Rep"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openEditModal(rep)} className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openPasswordResetDialog(rep.email, rep.full_name)} className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5" title="Change Password"><RotateCcw className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleToggleStatus(rep.user_id, rep.status)} className={`p-1 rounded text-[10px] font-medium ${rep.status === 'nlc' ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`} title={rep.status === 'nlc' ? 'Activate' : 'Deactivate'}>
                                {rep.status === 'nlc' ? '✓' : '✗'}
                              </button>
                              {rep.role !== 'admin' && (
                                <button onClick={() => handlePromoteDemote(rep.user_id, rep.role)} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="Promote"><ChevronUp className="w-3.5 h-3.5" /></button>
                              )}
                              {rep.role === 'admin' && rep.email !== SUPER_ADMIN_EMAIL && (
                                <button onClick={() => handlePromoteDemote(rep.user_id, rep.role)} className="p-1 rounded text-orange-400/60 hover:text-orange-400 hover:bg-orange-400/5" title="Demote"><ChevronDown className="w-3.5 h-3.5" /></button>
                              )}
                              {rep.email !== SUPER_ADMIN_EMAIL && isSuperAdmin && (
                                <button onClick={() => setDeleteTarget(rep)} className="p-1 rounded text-red-500/60 hover:text-red-500 hover:bg-red-500/5" title="Delete User"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-white/30">No members found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========== TEAMS TAB ========== */}
          <TabsContent value="teams">
            {isSuperAdmin && (
              <div className="flex gap-2 mb-4">
                <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="New team name..." className="bg-white/5 border-white/10 max-w-xs" />
                <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()} className="gap-1 bg-white text-black hover:bg-white/90"><Plus className="w-4 h-4" /> Create Team</Button>
              </div>
            )}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Search teams..." className="pl-9 bg-white/5 border-white/10" />
            </div>
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Team Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Pillar Leader</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Members</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Created</th>
                    {isSuperAdmin && <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map(team => (
                    <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-2"><Users className="w-4 h-4 text-primary/60" />{team.name}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={team.leader_id || 'none'}
                          onValueChange={(val) => handleAssignLeader(team.id, val === 'none' ? null : val)}
                        >
                          <SelectTrigger className="w-48 bg-white/5 border-white/10 h-8 text-xs">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {managers.map(m => (
                              <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-white/60">{team.member_count}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">{team.created_at ? format(new Date(team.created_at), 'MMM d, yyyy') : '—'}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditTeam(team); setEditTeamName(team.name); }} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5" title="Rename"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setDeleteTeam(team); setReassignTeamId(''); }} className="p-1.5 rounded text-red-500/60 hover:text-red-500 hover:bg-red-500/5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========== ROSTER & ASSIGN TAB (combined) ========== */}
          <TabsContent value="roster">
            <div className="flex items-center gap-2 mb-4">
              <Button
                size="sm"
                variant={rosterSubTab === 'sync' ? 'default' : 'outline'}
                className={`text-xs h-7 gap-1.5 ${rosterSubTab === 'sync' ? 'bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                onClick={() => setRosterSubTab('sync')}
              >
                <Users className="w-3 h-3" /> Roster
              </Button>
              <Button
                size="sm"
                variant={rosterSubTab === 'import' ? 'default' : 'outline'}
                className={`text-xs h-7 gap-1.5 ${rosterSubTab === 'import' ? 'bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                onClick={() => setRosterSubTab('import')}
              >
                <Upload className="w-3 h-3" /> Mass Import
              </Button>
              <Button
                size="sm"
                variant={rosterSubTab === 'assign' ? 'default' : 'outline'}
                className={`text-xs h-7 gap-1.5 ${rosterSubTab === 'assign' ? 'bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                onClick={() => setRosterSubTab('assign')}
              >
                <ClipboardList className="w-3 h-3" /> Assignments
              </Button>
            </div>
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              {rosterSubTab === 'sync' ? (
                <LazyRosterStatus
                  profiles={reps.map(r => ({ user_id: r.user_id, full_name: r.full_name, email: r.email, phone: (r as any).phone, direct_manager: r.direct_manager, status: r.status, avatar_url: (r as any).avatar_url, onboarding_status: (r as any).onboarding_status, team_id: r.team_id, role: r.role }))}
                  managers={managers}
                  teams={teamsSimple}
                  onRefresh={fetchData}
                />
              ) : rosterSubTab === 'import' ? (
                <LazyMassImport
                  profiles={reps.map(r => ({ user_id: r.user_id, full_name: r.full_name, email: r.email }))}
                  managers={managers}
                  teams={teamsSimple}
                  onRefresh={fetchData}
                />
              ) : (
                <LazyAssignments managers={managers} teams={teamsSimple} onRefresh={fetchData} />
              )}
            </Suspense>
          </TabsContent>

          {/* ========== SYSTEM CONTROLS TAB ========== */}
          {isSuperAdmin && (
            <TabsContent value="system">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Global Settings</h2>
                  <div className="border border-white/10 rounded-lg divide-y divide-white/5">
                    {[
                      { key: 'bootcamp_required', label: 'Summer Checklist Required', desc: 'Require rookies to complete Summer Checklist before app access' },
                      { key: 'bootcamp_skip_allowed', label: 'Allow Checklist Skip', desc: 'Show a "Skip for Now" button so reps can bypass the Summer Checklist temporarily' },
                      { key: 'approval_required', label: 'Approval Required', desc: 'Require admin approval for new sign-ups' },
                      { key: 'public_signups', label: 'Public Sign-Ups', desc: 'Allow new users to sign up from the login page' },
                      { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Disable entire app for all non-admin users' },
                      { key: 'demo_mode', label: 'Demo Mode', desc: 'Mask sensitive data (names, emails, phones) for safe presentations and demos' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={settings[item.key] === 'true'}
                          onCheckedChange={() => handleToggleSetting(item.key)}
                          disabled={settingsLoading}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4">Admin Utilities</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start gap-2 border-white/10 text-white/70 hover:text-white" onClick={() => {
                      const allProfiles = reps.map(r => `${r.full_name},${r.email},${r.role},${r.status},${getTeamName(r.team_id)}`).join('\n');
                      const csv = `Name,Email,Role,Status,Team\n${allProfiles}`;
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'users-export.csv'; a.click();
                      toast({ title: 'Users Exported' });
                    }}>
                      Export Users (CSV)
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Create Rep Modal */}
        <CreateRepModal open={createOpen} onOpenChange={setCreateOpen} managers={managers} teams={teamsSimple} onSuccess={fetchData} />
        <BootcampDemoWalkthrough open={demoOpen} onOpenChange={setDemoOpen} />

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
                <label className="block text-sm font-medium text-foreground mb-1">Team</label>
                <select className="input-field w-full" value={editForm.team_id} onChange={e => setEditForm(f => ({ ...f, team_id: e.target.value }))}>
                  <option value="">None</option>
                  {teamsSimple.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
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
                <select className="input-field w-full" value={editForm.role} onChange={e => {
                  const newRole = e.target.value;
                  setEditForm(f => ({
                    ...f,
                    role: newRole,
                    experience: (newRole === 'manager' || newRole === 'admin') ? 'veteran' : f.experience,
                  }));
                }}>
                  <option value="rookie">Rookie</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editForm.role === 'rookie' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Experience Level</label>
                  <select className="input-field w-full" value={editForm.experience} onChange={e => setEditForm(f => ({ ...f, experience: e.target.value }))}>
                    <option value="rookie">Rookie</option>
                    <option value="veteran">Veteran</option>
                  </select>
                </div>
              )}
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

        {/* Change Password Dialog */}
        <Dialog open={!!passwordResetTarget} onOpenChange={(open) => !open && setPasswordResetTarget(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Set a new password for <strong>{passwordResetTarget?.full_name}</strong></p>
            <div className="space-y-4 mt-2">
              <Input
                type="password"
                placeholder="New password (min 6 characters)"
                value={customPassword}
                onChange={e => setCustomPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmPasswordReset()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPasswordResetTarget(null)}>Cancel</Button>
                <Button onClick={handleConfirmPasswordReset} disabled={customPassword.length < 6}>Set Password</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete User?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Are you sure you want to permanently delete <strong className="text-foreground">{deleteTarget?.full_name}</strong> ({deleteTarget?.email})?</p>
                  <p>This will remove their account entirely and cannot be undone.</p>
                  <p>If they need access again later, consider marking them as <strong className="text-foreground">'Inactive'</strong> instead.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) {
                    handleToggleStatus(deleteTarget.user_id, deleteTarget.status === 'nlc' ? 'nlc' : 'active');
                    setDeleteTarget(null);
                  }
                }}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Mark Inactive
              </AlertDialogAction>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Permanently Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename Team Modal */}
        <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Rename Team</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Input value={editTeamName} onChange={e => setEditTeamName(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button>
                <Button onClick={handleRenameTeam} className="bg-white text-black hover:bg-white/90">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Team Modal */}
        <AlertDialog open={!!deleteTeam} onOpenChange={(open) => !open && setDeleteTeam(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team: {deleteTeam?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTeam && deleteTeam.member_count > 0 ? (
                  <>This team has {deleteTeam.member_count} member(s). Reassign them first:<br/>
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

        {/* Bootcamp Detail Modal */}
        <Dialog open={!!bootcampDetail} onOpenChange={(open) => !open && setBootcampDetail(null)}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Summer Checklist Details — {bootcampDetail?.full_name}</DialogTitle>
            </DialogHeader>
            {bootcampDetail && (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="text-foreground">{bootcampDetail.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Team</p>
                    <p className="text-foreground">{bootcampDetail.team_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Agreement Start Date</p>
                    <p className="text-foreground">{bootcampDetail.agreement_start_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Agreement End Date</p>
                    <p className="text-foreground">{bootcampDetail.agreement_end_date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Completed At</p>
                    <p className="text-foreground">{bootcampDetail.bootcamp_completed_at ? format(new Date(bootcampDetail.bootcamp_completed_at), 'MMM d, yyyy h:mm a') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Signature Name</p>
                    <p className="text-foreground">{bootcampDetail.signature_name || '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Videos</h3>
                  {[
                    { label: 'Sunblock', url: bootcampDetail.sunblock_video_url },
                    { label: 'Motivation', url: bootcampDetail.motivation_video_url },
                    { label: 'Final Commitment', url: bootcampDetail.final_commitment_video_url },
                  ].map(v => (
                    <div key={v.label} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                      <span className="text-sm text-foreground">{v.label}</span>
                      {v.url ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openVideoInNewTab(v.url)}>
                          <Play className="w-3 h-3" /> Play
                        </Button>
                      ) : (
                        <span className="text-white/30 text-xs">Not uploaded</span>
                      )}
                    </div>
                  ))}
                </div>

                {bootcampDetail.signature_data && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Signature</h3>
                    <div className="bg-white rounded-lg p-2 inline-block">
                      <img src={bootcampDetail.signature_data} alt="Signature" className="max-h-24" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
