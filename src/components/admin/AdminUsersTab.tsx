import { useState, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Search, Upload, Users, UserCheck, ArrowUpDown, Edit2, Eye, RotateCcw,
  ChevronUp, ChevronDown, Trash2, X, Globe, Loader2
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useNavigate } from 'react-router-dom';

const LazyMassImport = lazy(() => import('@/components/admin/AdminMassImport'));

/* ── Pipeline Statuses ── */
const PIPELINE_STATUSES = [
  { key: 'pending', label: 'Prospect Added', color: 'text-muted-foreground', bg: 'bg-muted/30 border-muted' },
  { key: 'contract_signed', label: 'Contract Signed', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  { key: 'info_added', label: 'Info Added', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  { key: 'onboarded', label: 'Onboarded', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  { key: 'summer_ready', label: 'Summer Ready', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
] as const;

function PipelineBadge({ status }: { status: string }) {
  const info = PIPELINE_STATUSES.find(s => s.key === status) || PIPELINE_STATUSES[0];
  return (
    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 whitespace-nowrap ${info.color} ${info.bg}`}>
      {info.label}
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
      role === 'admin' || role === 'owner'
        ? 'bg-purple-500/20 text-purple-400'
        : isManager
        ? 'bg-primary/20 text-primary'
        : 'bg-green-500/20 text-green-400'
    }`}>
      {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : isManager ? 'Manager' : 'Rookie'}
    </span>
  );
}

export interface UserRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  direct_manager: string | null;
  status: string | null;
  approved: boolean | null;
  created_at: string | null;
  team_id: string | null;
  role?: string;
  experience?: string | null;
  avatar_url?: string | null;
  onboarding_status?: string | null;
  organization?: string | null;
  region?: string | null;
  office_name?: string | null;
  recruiter?: string | null;
  last_active_at?: string | null;
  bootcamp_completed?: boolean;
}

interface AdminUsersTabProps {
  users: UserRow[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onRefresh: () => void;
  onEditUser: (user: UserRow) => void;
  onResetPassword: (email: string, fullName: string) => void;
  onToggleStatus: (userId: string, currentStatus: string | null) => void;
  onPromoteDemote: (userId: string, currentRole: string | undefined) => void;
  onDeleteUser: (user: UserRow) => void;
  superAdminEmail: string;
}

type SubView = 'list' | 'import';
type SortKey = 'name' | 'team' | 'role' | 'date' | 'pipeline' | 'status';
type QuickFilter = 'all' | 'active' | 'not_in_app' | 'onboarded' | 'summer_ready' | 'nlc';

export default function AdminUsersTab({
  users, managers, teams, isAdmin, isSuperAdmin, onRefresh,
  onEditUser, onResetPassword, onToggleStatus, onPromoteDemote, onDeleteUser, superAdminEmail,
}: AdminUsersTabProps) {
  const navigate = useNavigate();
  const { startImpersonating } = useRookieView();
  const [subView, setSubView] = useState<SubView>('list');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [editingPipeline, setEditingPipeline] = useState('');

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return '—';
    return teams.find(t => t.id === teamId)?.name || '—';
  };

  // Compute stats (deduplicated by user_id)
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const nlc = users.filter(u => u.status === 'nlc').length;
    const inApp = users.filter(u => u.approved === true).length;
    const notInApp = users.filter(u => !u.approved).length;
    const pipelineCounts: Record<string, number> = {};
    for (const s of PIPELINE_STATUSES) pipelineCounts[s.key] = 0;
    for (const u of users) {
      if (u.status === 'nlc') continue; // NLC users don't count in pipeline
      const ps = u.onboarding_status || 'pending';
      pipelineCounts[ps] = (pipelineCounts[ps] || 0) + 1;
    }
    return { total, active, nlc, inApp, notInApp, pipelineCounts };
  }, [users]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = users;

    // Quick filter
    switch (quickFilter) {
      case 'active':
        list = list.filter(u => u.status === 'active');
        break;
      case 'not_in_app':
        list = list.filter(u => !u.approved);
        break;
      case 'onboarded':
        list = list.filter(u => u.onboarding_status === 'onboarded');
        break;
      case 'summer_ready':
        list = list.filter(u => u.onboarding_status === 'summer_ready');
        break;
      case 'nlc':
        list = list.filter(u => u.status === 'nlc');
        break;
      default:
        // Hide NLC by default unless explicitly viewing NLC
        list = list.filter(u => u.status !== 'nlc');
    }

    // Pipeline filter (stacks with quick filter)
    if (pipelineFilter !== 'all') {
      list = list.filter(u => (u.onboarding_status || 'pending') === pipelineFilter);
    }

    // Team filter
    if (teamFilter !== 'all') {
      if (teamFilter === 'none') {
        list = list.filter(u => !u.team_id);
      } else {
        list = list.filter(u => u.team_id === teamFilter);
      }
    }

    // Manager filter
    if (managerFilter !== 'all') {
      if (managerFilter === 'none') {
        list = list.filter(u => !u.direct_manager);
      } else {
        list = list.filter(u => u.direct_manager === managerFilter);
      }
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.direct_manager || '').toLowerCase().includes(q)
      );
    }

    // Sort — approved/active first, then secondary sort
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const aApproved = a.approved && a.status === 'active' ? 0 : 1;
      const bApproved = b.approved && b.status === 'active' ? 0 : 1;
      if (aApproved !== bApproved) return aApproved - bApproved;

      switch (sortBy) {
        case 'team': return dir * getTeamName(a.team_id).localeCompare(getTeamName(b.team_id));
        case 'role': return dir * (a.role || 'rookie').localeCompare(b.role || 'rookie');
        case 'date': return dir * (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        case 'pipeline': {
          const order = ['summer_ready', 'onboarded', 'contract_signed', 'info_added', 'pending'];
          return dir * (order.indexOf(a.onboarding_status || 'pending') - order.indexOf(b.onboarding_status || 'pending'));
        }
        case 'status': return dir * (a.status || 'active').localeCompare(b.status || 'active');
        default: return dir * a.full_name.localeCompare(b.full_name);
      }
    });
  }, [users, quickFilter, pipelineFilter, teamFilter, managerFilter, search, sortBy, sortDir]);

  const handleUpdatePipeline = async (userId: string, newStatus: string) => {
    const { error } = await supabase.from('profiles').update({ onboarding_status: newStatus } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pipeline Status Updated' });
      setDetailUser(null);
      onRefresh();
    }
  };

  const handleUpdateManager = async (userId: string, managerName: string) => {
    const { error } = await supabase.from('profiles').update({ direct_manager: managerName || null } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Updated' });
      setDetailUser(null);
      onRefresh();
    }
  };

  const handleUpdateTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase.from('profiles').update({ team_id: teamId || null } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team Updated' });
      setDetailUser(null);
      onRefresh();
    }
  };

  const hasActiveFilters = pipelineFilter !== 'all' || teamFilter !== 'all' || managerFilter !== 'all';

  const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'not_in_app', label: 'Not In-App' },
    { key: 'onboarded', label: 'Onboarded' },
    { key: 'summer_ready', label: 'Summer Ready' },
    { key: 'nlc', label: 'NLC' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-view toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={subView === 'list' ? 'default' : 'outline'}
          className={`text-xs h-7 gap-1.5 ${subView === 'list' ? 'bg-primary text-primary-foreground' : 'border-border/30 text-muted-foreground hover:bg-muted/20'}`}
          onClick={() => setSubView('list')}
        >
          <Users className="w-3 h-3" /> Users
        </Button>
        <Button
          size="sm"
          variant={subView === 'import' ? 'default' : 'outline'}
          className={`text-xs h-7 gap-1.5 ${subView === 'import' ? 'bg-primary text-primary-foreground' : 'border-border/30 text-muted-foreground hover:bg-muted/20'}`}
          onClick={() => setSubView('import')}
        >
          <Upload className="w-3 h-3" /> Import
        </Button>
      </div>

      {subView === 'import' ? (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <LazyMassImport
            profiles={users.map(u => ({ user_id: u.user_id, full_name: u.full_name, email: u.email, phone: u.phone, region: u.region, organization: u.organization, office_name: u.office_name, direct_manager: u.direct_manager, experience: u.experience, team_id: u.team_id }))}
            managers={managers}
            teams={teams}
            onRefresh={onRefresh}
          />
        </Suspense>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button
              onClick={() => { setQuickFilter('all'); setPipelineFilter('all'); }}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                quickFilter === 'all' && pipelineFilter === 'all'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border/30 bg-card/50 hover:bg-card/80'
              )}
            >
              <p className="text-lg font-black text-foreground">{stats.total}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
            </button>
            <button
              onClick={() => { setQuickFilter('all'); setPipelineFilter('all'); }}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                'border-border/30 bg-card/50 hover:bg-card/80'
              )}
            >
              <p className="text-lg font-black text-blue-400">{stats.inApp}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">In-App</p>
            </button>
            <button
              onClick={() => { setQuickFilter('not_in_app'); setPipelineFilter('all'); }}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                quickFilter === 'not_in_app'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border/30 bg-card/50 hover:bg-card/80'
              )}
            >
              <p className="text-lg font-black text-amber-400">{stats.notInApp}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Not In-App</p>
            </button>
            <button
              onClick={() => { setQuickFilter('active'); setPipelineFilter('all'); }}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                quickFilter === 'active'
                  ? 'border-green-500/40 bg-green-500/10 ring-1 ring-green-500/30'
                  : 'border-border/30 bg-card/50 hover:bg-card/80'
              )}
            >
              <p className="text-lg font-black text-green-400">{stats.active}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</p>
            </button>
            <button
              onClick={() => { setQuickFilter('nlc'); setPipelineFilter('all'); }}
              className={cn(
                'p-2 rounded-lg border text-center transition-all',
                quickFilter === 'nlc'
                  ? 'border-red-500/40 bg-red-500/10 ring-1 ring-red-500/30'
                  : 'border-border/30 bg-card/50 hover:bg-card/80'
              )}
            >
              <p className="text-lg font-black text-red-400">{stats.nlc}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">NLC</p>
            </button>
          </div>

          {/* Pipeline stat chips */}
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => { setPipelineFilter(pipelineFilter === s.key ? 'all' : s.key); setQuickFilter('all'); }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all',
                  pipelineFilter === s.key
                    ? `${s.bg} ${s.color} ring-1 ring-current/30`
                    : 'border-border/20 text-muted-foreground hover:text-foreground hover:bg-muted/20'
                )}
              >
                {s.label} · {stats.pipelineCounts[s.key] || 0}
              </button>
            ))}
          </div>

          {/* ── Search + Filters Bar ── */}
          <div className="flex flex-col gap-2">
            {/* Quick filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {QUICK_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => { setQuickFilter(f.key); if (f.key !== 'all') setPipelineFilter('all'); }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all',
                    quickFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search + dropdowns row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, email, phone, manager..."
                  className="pl-9 h-8 bg-card/50 border-border/30 text-xs"
                />
              </div>
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="h-8 w-[140px] bg-card/50 border-border/30 text-xs">
                  <SelectValue placeholder="Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  <SelectItem value="none">No Manager</SelectItem>
                  {managers.map(m => <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-8 w-[120px] bg-card/50 border-border/30 text-xs">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-8 w-[100px] bg-card/50 border-border/30 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="pipeline">Pipeline</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </Button>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground gap-1"
                  onClick={() => { setTeamFilter('all'); setManagerFilter('all'); setPipelineFilter('all'); setQuickFilter('all'); }}
                >
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
            </div>
          </div>

          {/* ── Master Table ── */}
          <div className="border border-border/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-card/30">
                  <th className="w-[160px] text-left px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Name</th>
                  <th className="w-[85px] text-left px-2 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Pipeline</th>
                  <th className="w-[40px] text-center px-1 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Act</th>
                  <th className="w-[35px] text-center px-1 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">NLC</th>
                  <th className="w-[35px] text-center px-1 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    <Globe className="w-3 h-3 mx-auto" />
                  </th>
                  <th className="w-[100px] text-left px-2 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden lg:table-cell">Manager</th>
                  <th className="w-[80px] text-left px-2 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden lg:table-cell">Team</th>
                  <th className="w-[50px] text-left px-2 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden xl:table-cell">Role</th>
                  {isAdmin && (
                    <th className="w-[90px] text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const isActive = user.status === 'active';
                  const isNLC = user.status === 'nlc';
                  const isInApp = user.approved === true;
                  return (
                    <tr
                      key={user.user_id}
                      className={cn(
                        'border-b border-border/10 hover:bg-card/40 transition-colors cursor-pointer',
                        isNLC && 'opacity-50',
                        !isInApp && !isNLC && 'opacity-70'
                      )}
                      onClick={() => { setDetailUser(user); setEditingPipeline(user.onboarding_status || 'pending'); }}
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar avatarUrl={user.avatar_url} fullName={user.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{user.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <PipelineBadge status={user.onboarding_status || 'pending'} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <span className={cn('inline-block w-2 h-2 rounded-full', isActive ? 'bg-green-400' : 'bg-muted-foreground/30')} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {isNLC && <span className="inline-block w-2 h-2 rounded-full bg-red-400" />}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {isInApp ? (
                          <span className="text-green-400 text-[10px]">✓</span>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground truncate hidden lg:table-cell">{user.direct_manager || '—'}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground truncate hidden lg:table-cell">{getTeamName(user.team_id)}</td>
                      <td className="px-2 py-1.5 hidden xl:table-cell"><RoleBadge role={user.role || 'rookie'} /></td>
                      {isAdmin && (
                        <td className="px-3 py-1.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => { startImpersonating({ user_id: user.user_id, full_name: user.full_name, email: user.email }); navigate('/app/rookie'); }} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="View as Rep"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onEditUser(user)} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-muted/20" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onResetPassword(user.email, user.full_name)} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-muted/20" title="Password"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onToggleStatus(user.user_id, user.status)} className={`p-1 rounded text-[10px] font-medium ${isNLC ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`} title={isNLC ? 'Activate' : 'Deactivate'}>
                              {isNLC ? '✓' : '✗'}
                            </button>
                            {user.role !== 'admin' && user.role !== 'owner' && (
                              <button onClick={() => onPromoteDemote(user.user_id, user.role)} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="Promote"><ChevronUp className="w-3.5 h-3.5" /></button>
                            )}
                            {user.role === 'admin' && user.email !== superAdminEmail && (
                              <button onClick={() => onPromoteDemote(user.user_id, user.role)} className="p-1 rounded text-orange-400/60 hover:text-orange-400 hover:bg-orange-400/5" title="Demote"><ChevronDown className="w-3.5 h-3.5" /></button>
                            )}
                            {user.email !== superAdminEmail && isSuperAdmin && (
                              <button onClick={() => onDeleteUser(user)} className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{filtered.length} of {users.length} users shown</p>
        </>
      )}

      {/* ── Detail / Quick-Edit Modal ── */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <UserAvatar avatarUrl={detailUser.avatar_url} fullName={detailUser.full_name} size="lg" />
                  <div>
                    <span className="block text-foreground">{detailUser.full_name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={detailUser.role || 'rookie'} />
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{getTeamName(detailUser.team_id)}</span>
                      {!detailUser.approved && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-[9px] font-medium text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">Not In-App</span>
                        </>
                      )}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-xs text-foreground truncate">{detailUser.email}</p>
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="text-xs text-foreground">{detailUser.phone || '—'}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline Status</p>
                  <Select value={editingPipeline} onValueChange={setEditingPipeline}>
                    <SelectTrigger className="h-8 bg-card/50 border-border/30 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map(s => (
                        <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingPipeline !== (detailUser.onboarding_status || 'pending') && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-primary text-primary-foreground text-xs"
                      onClick={() => handleUpdatePipeline(detailUser.user_id, editingPipeline)}
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Update Pipeline
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Direct Manager</p>
                  <p className="text-sm text-foreground">{detailUser.direct_manager || '—'}</p>
                  <Select onValueChange={(v) => handleUpdateManager(detailUser.user_id, v)}>
                    <SelectTrigger className="h-8 bg-card/50 border-border/30 text-xs">
                      <SelectValue placeholder="Change manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {managers.map(m => <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team</p>
                  <p className="text-sm text-foreground">{getTeamName(detailUser.team_id)}</p>
                  <Select onValueChange={(v) => handleUpdateTeam(detailUser.user_id, v)}>
                    <SelectTrigger className="h-8 bg-card/50 border-border/30 text-xs">
                      <SelectValue placeholder="Change team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Team</SelectItem>
                      {teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-foreground">Active</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full', detailUser.status === 'active' ? 'bg-green-400' : 'bg-muted-foreground/30')} />
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-foreground">NLC</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full', detailUser.status === 'nlc' ? 'bg-red-400' : 'bg-muted-foreground/30')} />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
