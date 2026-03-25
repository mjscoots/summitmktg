import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Search, UserCheck, Mail, Phone, ChevronRight, Users, ArrowUpDown } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'info_added', label: 'Info Added' },
  { key: 'contract_signed', label: 'Contract Signed' },
  { key: 'onboarded', label: 'Onboarded' },
  { key: 'summer_ready', label: 'Summer Ready' },
] as const;

type StatusTab = typeof STATUS_TABS[number]['key'];

const STATUS_COLORS: Record<string, { badge: string }> = {
  summer_ready: { badge: 'bg-primary/15 text-primary border-primary/30' },
  onboarded: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  contract_signed: { badge: 'bg-primary/15 text-primary border-primary/30' },
  info_added: { badge: 'bg-primary/15 text-primary border-primary/30' },
  pending: { badge: 'bg-muted/30 text-muted-foreground border-muted' },
};

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    summer_ready: 'Summer Ready',
    onboarded: 'Onboarded',
    contract_signed: 'Contract Signed',
    info_added: 'Info Added',
    pending: 'Pending',
  };
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${colors.badge}`}>
      {labels[status] || 'Pending'}
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
      role === 'admin' || role === 'owner'
        ? 'bg-purple-500/20 text-primary'
        : isManager
        ? 'bg-primary/20 text-primary'
        : 'bg-primary/20 text-primary'
    }`}>
      {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : isManager ? 'Manager' : 'Rookie'}
    </span>
  );
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  direct_manager: string | null;
  status: string | null;
  avatar_url?: string | null;
  onboarding_status?: string | null;
  team_id?: string | null;
  role?: string;
  created_at?: string | null;
}

interface RosterStatusViewProps {
  profiles: ProfileRow[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

type SortKey = 'name' | 'team' | 'role' | 'date';

export default function RosterStatusView({ profiles, managers, teams, onRefresh }: RosterStatusViewProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filter out admin/owner roles
  const visibleProfiles = useMemo(() => 
    profiles.filter(p => p.role !== 'admin' && p.role !== 'owner'),
    [profiles]
  );

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return '—';
    return teams.find(t => t.id === teamId)?.name || '—';
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: visibleProfiles.length };
    for (const p of visibleProfiles) {
      const s = p.onboarding_status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [visibleProfiles]);

  const filtered = useMemo(() => {
    let list = visibleProfiles;
    if (activeTab !== 'all') {
      list = list.filter(p => (p.onboarding_status || 'pending') === activeTab);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.direct_manager || '').toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'team': return dir * getTeamName(a.team_id).localeCompare(getTeamName(b.team_id));
        case 'role': return dir * (a.role || 'rookie').localeCompare(b.role || 'rookie');
        case 'date': return dir * (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        default: return dir * a.full_name.localeCompare(b.full_name);
      }
    });
  }, [visibleProfiles, activeTab, search, sortBy, sortDir]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const { error } = await supabase.from('profiles').update({ onboarding_status: newStatus } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated' });
      setSelectedProfile(null);
      onRefresh();
    }
  };

  const handleUpdateManager = async (userId: string, managerName: string) => {
    const { error } = await supabase.from('profiles').update({ direct_manager: managerName } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Updated' });
      setSelectedProfile(null);
      onRefresh();
    }
  };

  const handleUpdateTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase.from('profiles').update({ team_id: teamId || null } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team Updated' });
      setSelectedProfile(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Status count summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_TABS.map(tab => {
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              <p className={`text-xl font-black ${isActive ? 'text-primary' : 'text-foreground'}`}>{count}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or manager..."
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-xs">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="date">Date Added</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-2 border-white/10 text-muted-foreground hover:text-foreground"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">{sortDir === 'asc' ? 'A→Z' : 'Z→A'}</span>
        </Button>
      </div>

      {/* Results */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_80px_120px_120px_100px_32px] gap-0 bg-white/[0.02] border-b border-white/10 px-4 py-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Manager</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
          <span></span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
          {filtered.map(p => (
            <button
              key={p.user_id}
              onClick={() => { setSelectedProfile(p); setEditingStatus(p.onboarding_status || 'pending'); }}
              className="w-full sm:grid sm:grid-cols-[1fr_80px_120px_120px_100px_32px] flex flex-col gap-1 sm:gap-0 items-start sm:items-center px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar avatarUrl={p.avatar_url} fullName={p.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                </div>
              </div>
              <div><RoleBadge role={p.role || 'rookie'} /></div>
              <span className="text-xs text-muted-foreground truncate">{p.direct_manager || '—'}</span>
              <span className="text-xs text-muted-foreground truncate">{getTeamName(p.team_id)}</span>
              <StatusBadge status={p.onboarding_status || 'pending'} />
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:block" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No reps found</div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{filtered.length} reps shown</p>

      {/* Detail Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          {selectedProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <UserAvatar avatarUrl={selectedProfile.avatar_url} fullName={selectedProfile.full_name} size="lg" />
                  <div>
                    <span className="block text-foreground">{selectedProfile.full_name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={selectedProfile.role || 'rookie'} />
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{getTeamName(selectedProfile.team_id)}</span>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* Contact */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm text-foreground truncate">{selectedProfile.email}</p>
                  </div>
                </div>
                {selectedProfile.phone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-foreground">{selectedProfile.phone}</p>
                    </div>
                  </div>
                )}

                {/* Onboarding Status */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Onboarding Status</p>
                  <Select value={editingStatus} onValueChange={setEditingStatus}>
                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_TABS.filter(t => t.key !== 'all').map(t => (
                        <SelectItem key={t.key} value={t.key} className="text-xs">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingStatus !== (selectedProfile.onboarding_status || 'pending') && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                      onClick={() => handleUpdateStatus(selectedProfile.user_id, editingStatus)}
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Update Status
                    </Button>
                  )}
                </div>

                {/* Manager */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Manager</p>
                  <p className="text-sm text-foreground">{selectedProfile.direct_manager || '—'}</p>
                  <Select onValueChange={(v) => handleUpdateManager(selectedProfile.user_id, v)}>
                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                      <SelectValue placeholder="Change manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(m => (
                        <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team</p>
                  <p className="text-sm text-foreground">{getTeamName(selectedProfile.team_id)}</p>
                  <Select onValueChange={(v) => handleUpdateTeam(selectedProfile.user_id, v)}>
                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                      <SelectValue placeholder="Change team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">No Team</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
