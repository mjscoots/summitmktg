import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Search, Edit2, UserCheck, Mail, Phone, ChevronRight } from 'lucide-react';
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

const STATUS_COLORS: Record<string, { badge: string; dot: string }> = {
  summer_ready: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  onboarded: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  contract_signed: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  info_added: { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  pending: { badge: 'bg-muted/30 text-muted-foreground border-muted', dot: 'bg-muted-foreground' },
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
}

interface RosterStatusViewProps {
  profiles: ProfileRow[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

export default function RosterStatusView({ profiles, managers, teams, onRefresh }: RosterStatusViewProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: profiles.length };
    for (const p of profiles) {
      const s = p.onboarding_status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [profiles]);

  const filtered = useMemo(() => {
    let list = profiles;
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
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, activeTab, search]);

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return '—';
    return teams.find(t => t.id === teamId)?.name || '—';
  };

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

  return (
    <div className="space-y-4">
      {/* Status count summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_TABS.map(tab => {
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          const colors = tab.key === 'all' ? null : STATUS_COLORS[tab.key];
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or manager..."
          className="pl-9 bg-white/5 border-white/10"
        />
      </div>

      {/* Results */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_100px_40px] sm:grid-cols-[1fr_160px_160px_120px_40px] gap-0 bg-white/[0.02] border-b border-white/10 px-4 py-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
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
              className="w-full grid grid-cols-[1fr_120px_140px_100px_40px] sm:grid-cols-[1fr_160px_160px_120px_40px] gap-0 items-center px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar avatarUrl={p.avatar_url} fullName={p.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground truncate">{p.direct_manager || '—'}</span>
              <span className="text-xs text-muted-foreground truncate">{getTeamName(p.team_id)}</span>
              <StatusBadge status={p.onboarding_status || 'pending'} />
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
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
                    <span className="text-xs text-muted-foreground">{selectedProfile.email}</span>
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
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team</p>
                  <p className="text-sm text-foreground">{getTeamName(selectedProfile.team_id)}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
