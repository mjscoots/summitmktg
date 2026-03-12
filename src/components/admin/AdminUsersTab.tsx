import { useState, useMemo, lazy, Suspense, Component, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Search,
  Upload,
  Users,
  UserCheck,
  Eye,
  Loader2,
  AlertTriangle,
  Monitor,
  MonitorOff,
  MoreHorizontal,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useNavigate } from 'react-router-dom';

const LazyMassImport = lazy(() => import('@/components/admin/AdminMassImport'));

class TableErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('AdminUsersTab table error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-foreground font-medium">Table failed to render</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          >
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PIPELINE_STATUSES = [
  { key: 'pending', label: 'Prospect Added' },
  { key: 'contract_signed', label: 'Contract Signed' },
  { key: 'info_added', label: 'Info Added' },
  { key: 'onboarded', label: 'Onboarded' },
  { key: 'summer_ready', label: 'Summer Ready' },
] as const;

const PIPELINE_RANK: Record<string, number> = {
  pending: 1,
  contract_signed: 2,
  info_added: 3,
  onboarded: 4,
  summer_ready: 5,
};

function pipelineLabel(value: string | null | undefined) {
  const key = value || 'pending';
  return PIPELINE_STATUSES.find((s) => s.key === key)?.label || 'Prospect Added';
}

function displayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function PipelineBadge({ status }: { status: string }) {
  const key = status || 'pending';

  const className =
    key === 'summer_ready'
      ? 'bg-primary text-primary-foreground border-primary/30'
      : key === 'onboarded'
        ? 'bg-primary/10 text-primary border-primary/20'
        : key === 'info_added'
          ? 'bg-accent text-accent-foreground border-border'
          : key === 'contract_signed'
            ? 'bg-secondary text-secondary-foreground border-border'
            : 'bg-muted text-muted-foreground border-border';

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap', className)}>
      {pipelineLabel(key)}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const normalized = role || 'rookie';
  const variant = normalized === 'owner' || normalized === 'admin' ? 'default' : 'secondary';

  return (
    <Badge variant={variant} className="text-[10px] h-5 px-2 uppercase tracking-wide">
      {normalized === 'owner' ? 'Owner' : normalized === 'admin' ? 'Admin' : normalized === 'manager' ? 'Manager' : 'Rookie'}
    </Badge>
  );
}

function StatusDot({ status }: { status: string | null }) {
  if (status === 'nlc') {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" title="NLC" />;
  }

  if (status === 'active') {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" title="Active" />;
  }

  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/40" title="Disabled" />;
}

function AppStatusBadge({ approved }: { approved: boolean | null }) {
  const inApp = approved === true;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        inApp
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {inApp ? <Monitor className="w-3 h-3" /> : <MonitorOff className="w-3 h-3" />}
      {inApp ? 'In-App' : 'Not In-App'}
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
  updated_at?: string | null;
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

type AppFilter = 'all' | 'in_app' | 'not_in_app';
type SortOption = 'name' | 'team' | 'progress' | 'recent';

export default function AdminUsersTab({
  users,
  managers,
  teams,
  isAdmin,
  isSuperAdmin,
  onRefresh,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onPromoteDemote,
  onDeleteUser,
  superAdminEmail,
}: AdminUsersTabProps) {
  const navigate = useNavigate();
  const { startImpersonating } = useRookieView();

  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [progressFilter, setProgressFilter] = useState<string>('all');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('progress');
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [editingPipeline, setEditingPipeline] = useState('');

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return '—';
    return teams.find((t) => t.id === teamId)?.name || '—';
  };

  const recruiterNames = useMemo(() => {
    const names = new Set<string>();

    for (const u of users) {
      const value = (u.direct_manager || u.recruiter || '').trim();
      if (value) names.add(value);
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const getOperationalPriority = (u: UserRow) => {
    const progress = u.onboarding_status || 'pending';
    const inApp = u.approved === true;
    const isNlc = u.status === 'nlc';

    if (isNlc) return 800;

    if (inApp && progress === 'summer_ready') return 10;
    if (inApp && progress === 'onboarded') return 20;
    if (!inApp && progress === 'summer_ready') return 30;
    if (!inApp && progress === 'onboarded') return 40;
    if (!inApp && progress === 'info_added') return 50;
    if (!inApp && progress === 'contract_signed') return 60;
    if (progress === 'pending') return 70;

    return 100;
  };

  const filtered = useMemo(() => {
    const list = users.filter((u) => {
      const progress = u.onboarding_status || 'pending';
      const recruiter = (u.direct_manager || u.recruiter || '').trim();
      const teamName = getTeamName(u.team_id);

      if (statusFilter === 'active' && u.status !== 'active') return false;
      if (statusFilter === 'nlc' && u.status !== 'nlc') return false;

      if (progressFilter !== 'all' && progress !== progressFilter) return false;

      if (recruiterFilter !== 'all') {
        if (recruiterFilter === 'none' && recruiter) return false;
        if (recruiterFilter !== 'none' && recruiter !== recruiterFilter) return false;
      }

      if (teamFilter !== 'all') {
        if (teamFilter === 'none' && u.team_id) return false;
        if (teamFilter !== 'none' && u.team_id !== teamFilter) return false;
      }

      if (appFilter === 'in_app' && u.approved !== true) return false;
      if (appFilter === 'not_in_app' && u.approved === true) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const phone = (u.phone || '').toLowerCase();

        return (
          u.full_name.toLowerCase().includes(q) ||
          recruiter.toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.full_name.localeCompare(b.full_name);
      }

      if (sortBy === 'team') {
        const byTeam = getTeamName(a.team_id).localeCompare(getTeamName(b.team_id));
        if (byTeam !== 0) return byTeam;
        return a.full_name.localeCompare(b.full_name);
      }

      if (sortBy === 'recent') {
        const aTs = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTs = new Date(b.updated_at || b.created_at || 0).getTime();
        if (aTs !== bTs) return bTs - aTs;
      }

      const aPriority = getOperationalPriority(a);
      const bPriority = getOperationalPriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aRank = PIPELINE_RANK[a.onboarding_status || 'pending'] || 0;
      const bRank = PIPELINE_RANK[b.onboarding_status || 'pending'] || 0;
      if (aRank !== bRank) return bRank - aRank;

      return a.full_name.localeCompare(b.full_name);
    });
  }, [
    users,
    statusFilter,
    progressFilter,
    recruiterFilter,
    teamFilter,
    appFilter,
    sortBy,
    search,
  ]);

  const hasActiveFilters =
    !!search.trim() ||
    statusFilter !== 'all' ||
    progressFilter !== 'all' ||
    recruiterFilter !== 'all' ||
    teamFilter !== 'all' ||
    appFilter !== 'all' ||
    sortBy !== 'progress';

  const handleUpdatePipeline = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_status: newStatus } as never)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Progress Updated' });
    setDetailUser(null);
    onRefresh();
  };

  const handleUpdateManager = async (userId: string, managerName: string) => {
    const normalized = managerName || null;

    const { error } = await supabase
      .from('profiles')
      .update({ direct_manager: normalized, recruiter: normalized } as never)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Recruiter / Manager Updated' });
    setDetailUser(null);
    onRefresh();
  };

  const handleUpdateTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ team_id: teamId || null } as never)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Team Updated' });
    setDetailUser(null);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">People</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{users.length}</span>
          <span className="w-px h-4 bg-border" />
          {(() => {
            const inApp = users.filter(u => u.approved === true).length;
            const notInApp = users.filter(u => u.approved !== true).length;
            const active = users.filter(u => u.status === 'active').length;
            const nlc = users.filter(u => u.status === 'nlc').length;
            const pending = users.filter(u => (u.onboarding_status || 'pending') === 'pending').length;
            const contractSigned = users.filter(u => u.onboarding_status === 'contract_signed').length;
            const infoAdded = users.filter(u => u.onboarding_status === 'info_added').length;
            const onboarded = users.filter(u => u.onboarding_status === 'onboarded').length;
            const summerReady = users.filter(u => u.onboarding_status === 'summer_ready').length;
            return (
              <>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">In-App {inApp}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Not In-App {notInApp}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">Active {active}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">NLC {nlc}</span>
                <span className="w-px h-4 bg-border" />
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">Prospect {pending}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Signed {contractSigned}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Info Added {infoAdded}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Onboarded {onboarded}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Summer Ready {summerReady}</span>
              </>
            );
          })()}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 rounded-xl"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          Mass Import
        </Button>
      </div>

      <div className="rounded-xl border border-border/30 bg-card/40 p-2.5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="flex min-w-[1260px] items-center gap-2">
            <div className="relative w-[280px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, recruiter, team..."
                className="pl-9 h-9 bg-background/60"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px] bg-background/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="nlc">NLC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={progressFilter} onValueChange={setProgressFilter}>
              <SelectTrigger className="h-9 w-[170px] bg-background/60">
                <SelectValue placeholder="Progress" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Progress</SelectItem>
                {PIPELINE_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
              <SelectTrigger className="h-9 w-[190px] bg-background/60">
                <SelectValue placeholder="Recruiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recruiters</SelectItem>
                <SelectItem value="none">No Recruiter</SelectItem>
                {recruiterNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-9 w-[150px] bg-background/60">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="none">No Team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={appFilter} onValueChange={(v) => setAppFilter(v as AppFilter)}>
              <SelectTrigger className="h-9 w-[170px] bg-background/60">
                <SelectValue placeholder="App Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All App Statuses</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
                <SelectItem value="not_in_app">Not In-App</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-9 w-[170px] bg-background/60">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setProgressFilter('all');
                  setRecruiterFilter('all');
                  setTeamFilter('all');
                  setAppFilter('all');
                  setSortBy('progress');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <TableErrorBoundary onRetry={onRefresh}>
        <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-border/20 bg-background/40">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Name</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Team</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Progress</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-16">Status</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-28">App</th>
                {isAdmin && (
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-48">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                if (!u?.user_id) return null;

                const isNlc = u.status === 'nlc';

                return (
                  <tr
                    key={u.user_id}
                    className={cn(
                      'border-b border-border/10 hover:bg-background/30 transition-colors cursor-pointer',
                      isNlc && 'opacity-65'
                    )}
                    onClick={() => {
                      setDetailUser(u);
                      setEditingPipeline(u.onboarding_status || 'pending');
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar avatarUrl={u.avatar_url} fullName={u.full_name || 'Unknown'} size="sm" />
                        <p className={cn('text-xs font-medium truncate', isNlc ? 'text-destructive' : 'text-foreground')}>
                          {displayName(u.full_name || 'Unknown')}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate">
                      {getTeamName(u.team_id)}
                    </td>

                    <td className="px-3 py-2.5">
                      <PipelineBadge status={u.onboarding_status || 'pending'} />
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      <StatusDot status={u.status} />
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      <AppStatusBadge approved={u.approved} />
                    </td>

                    {isAdmin && (
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setDetailUser(u);
                              setEditingPipeline(u.onboarding_status || 'pending');
                            }}
                          >
                            View
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onEditUser(u)}
                          >
                            Edit
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                More
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onSelect={() => {
                                  startImpersonating({ user_id: u.user_id, full_name: u.full_name, email: u.email });
                                  navigate('/app');
                                }}
                              >
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                View as Rep
                              </DropdownMenuItem>

                              <DropdownMenuItem onSelect={() => onResetPassword(u.email, u.full_name)}>
                                Reset Password
                              </DropdownMenuItem>

                              <DropdownMenuItem onSelect={() => onToggleStatus(u.user_id, u.status)}>
                                {u.status === 'nlc' ? 'Set Active' : 'Set NLC'}
                              </DropdownMenuItem>

                              {u.role !== 'admin' && u.role !== 'owner' && (
                                <DropdownMenuItem onSelect={() => onPromoteDemote(u.user_id, u.role)}>
                                  Promote / Demote
                                </DropdownMenuItem>
                              )}

                              {u.role === 'admin' && u.email !== superAdminEmail && (
                                <DropdownMenuItem onSelect={() => onPromoteDemote(u.user_id, u.role)}>
                                  Promote / Demote
                                </DropdownMenuItem>
                              )}

                              {u.email !== superAdminEmail && isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => onDeleteUser(u)}>
                                    Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No people match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TableErrorBoundary>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Mass Import
            </DialogTitle>
            <DialogDescription className="sr-only">
              Import and sync reps in bulk, including progress and NLC updates.
            </DialogDescription>
          </DialogHeader>

          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
            <LazyMassImport
              profiles={users.map((u) => ({
                user_id: u.user_id,
                full_name: u.full_name,
                email: u.email,
                phone: u.phone,
                region: u.region,
                organization: u.organization,
                office_name: u.office_name,
                direct_manager: u.direct_manager,
                experience: u.experience,
                team_id: u.team_id,
                onboarding_status: u.onboarding_status,
                status: u.status,
                recruiter: u.recruiter,
              }))}
              managers={managers}
              teams={teams}
              onRefresh={() => {
                onRefresh();
                setStatusFilter('all');
                setProgressFilter('all');
                setRecruiterFilter('all');
                setTeamFilter('all');
                setAppFilter('all');
                setSortBy('progress');
                setImportOpen(false);
              }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogDescription className="sr-only">
            View and edit person details including progress stage, team, and recruiter.
          </DialogDescription>

          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <UserAvatar avatarUrl={detailUser.avatar_url} fullName={detailUser.full_name} size="lg" />
                  <div>
                    <span className="block text-foreground">{displayName(detailUser.full_name)}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <RoleBadge role={detailUser.role || 'rookie'} />
                      <span className="text-xs text-muted-foreground">{getTeamName(detailUser.team_id)}</span>
                      <AppStatusBadge approved={detailUser.approved} />
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
                  <Select value={editingPipeline} onValueChange={setEditingPipeline}>
                    <SelectTrigger className="h-8 bg-background/70 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingPipeline !== (detailUser.onboarding_status || 'pending') && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => handleUpdatePipeline(detailUser.user_id, editingPipeline)}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Update Progress
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recruiter / Manager</p>
                  <p className="text-sm text-foreground">{detailUser.direct_manager || detailUser.recruiter || '—'}</p>
                  <Select onValueChange={(v) => handleUpdateManager(detailUser.user_id, v)}>
                    <SelectTrigger className="h-8 bg-background/70 text-xs">
                      <SelectValue placeholder="Change recruiter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team</p>
                  <p className="text-sm text-foreground">{getTeamName(detailUser.team_id)}</p>
                  <Select onValueChange={(v) => handleUpdateTeam(detailUser.user_id, v)}>
                    <SelectTrigger className="h-8 bg-background/70 text-xs">
                      <SelectValue placeholder="Change team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-foreground">Active</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full', detailUser.status === 'active' ? 'bg-emerald-400' : 'bg-muted-foreground/30')} />
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-foreground">NLC</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full', detailUser.status === 'nlc' ? 'bg-destructive' : 'bg-muted-foreground/30')} />
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
