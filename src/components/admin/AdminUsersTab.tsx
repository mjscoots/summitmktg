import { useState, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Search, Upload, Users, UserCheck, ArrowUpDown, Edit2, Eye, RotateCcw,
  ChevronUp, ChevronDown, Trash2, X, Loader2
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

function StatusDot({ status }: { status: string | null }) {
  if (status === 'nlc') return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="NLC" />;
  if (status === 'active') return <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Active" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30" title="Disabled" />;
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

type AccountFilter = 'all' | 'in_app' | 'not_in_app';
type SortKey = 'name' | 'team' | 'pipeline' | 'date';

export default function AdminUsersTab({
  users, managers, teams, isAdmin, isSuperAdmin, onRefresh,
  onEditUser, onResetPassword, onToggleStatus, onPromoteDemote, onDeleteUser, superAdminEmail,
}: AdminUsersTabProps) {
  const navigate = useNavigate();
  const { startImpersonating } = useRookieView();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
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

  // ── Stats ──
  const stats = useMemo(() => {
    const total = users.length;
    const inApp = users.filter(u => u.approved === true).length;
    const notInApp = users.filter(u => u.approved !== true).length;
    const active = users.filter(u => u.status === 'active' && u.approved === true).length;
    // NLC = status === 'nlc' (not from pipeline)
    const nlc = users.filter(u => u.status === 'nlc').length;
    const pipelineCounts: Record<string, number> = {};
    for (const s of PIPELINE_STATUSES) pipelineCounts[s.key] = 0;
    for (const u of users) {
      if (u.status === 'nlc') continue;
      const ps = u.onboarding_status || 'pending';
      pipelineCounts[ps] = (pipelineCounts[ps] || 0) + 1;
    }
    return { total, inApp, notInApp, active, nlc, pipelineCounts };
  }, [users]);

  // ── Filter & Sort ──
  const filtered = useMemo(() => {
    let list = users;

    // Account filter
    switch (accountFilter) {
      case 'in_app':
        list = list.filter(u => u.approved === true);
        break;
      case 'not_in_app':
        list = list.filter(u => u.approved !== true);
        break;
    }

    // Pipeline filter
    if (pipelineFilter !== 'all') {
      list = list.filter(u => (u.onboarding_status || 'pending') === pipelineFilter);
    }

    // Team filter
    if (teamFilter !== 'all') {
      if (teamFilter === 'none') list = list.filter(u => !u.team_id);
      else list = list.filter(u => u.team_id === teamFilter);
    }

    // Manager filter
    if (managerFilter !== 'all') {
      if (managerFilter === 'none') list = list.filter(u => !u.direct_manager);
      else list = list.filter(u => u.direct_manager === managerFilter);
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

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      // NLC always last
      const aNlc = a.status === 'nlc' ? 1 : 0;
      const bNlc = b.status === 'nlc' ? 1 : 0;
      if (aNlc !== bNlc) return aNlc - bNlc;

      // In-App first
      const aInApp = a.approved === true ? 0 : 1;
      const bInApp = b.approved === true ? 0 : 1;
      if (aInApp !== bInApp) return aInApp - bInApp;

      switch (sortBy) {
        case 'team': return dir * getTeamName(a.team_id).localeCompare(getTeamName(b.team_id));
        case 'date': return dir * (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        case 'pipeline': {
          const order = ['summer_ready', 'onboarded', 'contract_signed', 'info_added', 'pending'];
          return dir * (order.indexOf(a.onboarding_status || 'pending') - order.indexOf(b.onboarding_status || 'pending'));
        }
        default: return dir * a.full_name.localeCompare(b.full_name);
      }
    });
  }, [users, accountFilter, pipelineFilter, teamFilter, managerFilter, search, sortBy, sortDir]);

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

  return (
    <div className="space-y-4">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> People
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1.5 border-border/30 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="w-3 h-3" /> Mass Import
        </Button>
      </div>

      {/* ── Top Counters ── */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { count: stats.total, label: 'Total', colorClass: 'text-foreground' },
          { count: stats.inApp, label: 'In-App', colorClass: 'text-blue-400' },
          { count: stats.notInApp, label: 'Not In-App', colorClass: 'text-amber-400' },
          { count: stats.active, label: 'Active', colorClass: 'text-green-400' },
          { count: stats.nlc, label: 'NLC', colorClass: 'text-red-400' },
        ].map(card => (
          <div
            key={card.label}
            className="p-2 rounded-lg border border-border/30 bg-card/50 text-center"
          >
            <p className={`text-lg font-black ${card.colorClass}`}>{card.count}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline Chips (small, below counters) ── */}
      <div className="flex flex-wrap gap-1">
        {PIPELINE_STATUSES.map(s => (
          <span key={s.key} className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
            {s.label}: {stats.pipelineCounts[s.key] || 0}
          </span>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col gap-2">
        {/* Account filter row: All | In-App | Not In-App */}
        <div className="flex items-center gap-1.5">
          {(['all', 'in_app', 'not_in_app'] as AccountFilter[]).map(f => {
            const labels: Record<AccountFilter, string> = { all: 'All', in_app: 'In-App', not_in_app: 'Not In-App' };
            return (
              <button
                key={f}
                onClick={() => setAccountFilter(f)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all',
                  accountFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Search + dropdowns */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, manager..."
              className="pl-9 h-8 bg-card/50 border-border/30 text-xs"
            />
          </div>
          {/* Pipeline dropdown */}
          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
            <SelectTrigger className="h-8 w-[150px] bg-card/50 border-border/30 text-xs">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipeline</SelectItem>
              {PIPELINE_STATUSES.map(s => (
                <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              onClick={() => { setTeamFilter('all'); setManagerFilter('all'); setPipelineFilter('all'); setAccountFilter('all'); }}
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="border border-border/30 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border/20 bg-card/30">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider hidden sm:table-cell">Team</th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Pipeline</th>
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-16">Status</th>
              {isAdmin && (
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-32">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isNLC = u.status === 'nlc';
              const isInApp = u.approved === true;
              return (
                <tr
                  key={u.user_id}
                  className={cn(
                    'border-b border-border/10 hover:bg-card/40 transition-colors cursor-pointer',
                    isNLC && 'opacity-40',
                    !isInApp && !isNLC && 'opacity-70'
                  )}
                  onClick={() => { setDetailUser(u); setEditingPipeline(u.onboarding_status || 'pending'); }}
                >
                  {/* Avatar + Name */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar avatarUrl={u.avatar_url} fullName={u.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className={cn("text-xs font-medium truncate", isNLC ? "text-red-400" : "text-foreground")}>{u.full_name}</p>
                        {!isInApp && (
                          <span className="text-[9px] text-amber-400/70">Not In-App</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Team */}
                  <td className="px-3 py-2 text-xs text-muted-foreground truncate hidden sm:table-cell">
                    {getTeamName(u.team_id)}
                  </td>
                  {/* Pipeline */}
                  <td className="px-3 py-2">
                    <PipelineBadge status={u.onboarding_status || 'pending'} />
                  </td>
                  {/* Status dot */}
                  <td className="px-2 py-2 text-center">
                    <StatusDot status={u.status} />
                  </td>
                  {/* Actions */}
                  {isAdmin && (
                    <td className="px-3 py-1.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => { startImpersonating({ user_id: u.user_id, full_name: u.full_name, email: u.email }); navigate('/app'); }} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="View as Rep"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onEditUser(u)} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-muted/20" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onResetPassword(u.email, u.full_name)} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-muted/20" title="Password"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onToggleStatus(u.user_id, u.status)} className={`p-1 rounded text-[10px] font-medium ${isNLC ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`} title={isNLC ? 'Activate' : 'Deactivate'}>
                          {isNLC ? '✓' : '✗'}
                        </button>
                        {u.role !== 'admin' && u.role !== 'owner' && (
                          <button onClick={() => onPromoteDemote(u.user_id, u.role)} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/5" title="Promote"><ChevronUp className="w-3.5 h-3.5" /></button>
                        )}
                        {u.role === 'admin' && u.email !== superAdminEmail && (
                          <button onClick={() => onPromoteDemote(u.user_id, u.role)} className="p-1 rounded text-orange-400/60 hover:text-orange-400 hover:bg-orange-400/5" title="Demote"><ChevronDown className="w-3.5 h-3.5" /></button>
                        )}
                        {u.email !== superAdminEmail && isSuperAdmin && (
                          <button onClick={() => onDeleteUser(u)} className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{filtered.length} of {users.length} users shown</p>

      {/* ── Mass Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Mass Import
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
            <LazyMassImport
              profiles={users.map(u => ({ user_id: u.user_id, full_name: u.full_name, email: u.email, phone: u.phone, region: u.region, organization: u.organization, office_name: u.office_name, direct_manager: u.direct_manager, experience: u.experience, team_id: u.team_id }))}
              managers={managers}
              teams={teams}
              onRefresh={() => { onRefresh(); setImportOpen(false); }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

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
                      {detailUser.approved !== true && (
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
