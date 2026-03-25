import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EXTERNAL_ROSTER, findBestMatch, matchNames } from '@/lib/externalRoster';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Search, Copy, CheckCircle, AlertTriangle, Link2, Loader2, X, Mail, Phone, UserCheck, Sun, MinusCircle } from 'lucide-react';
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

const STATUS_ORDER = ['summer_ready', 'onboarded', 'contract_signed', 'info_added', 'pending'] as const;

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  summer_ready: { label: 'Summer Ready', color: 'text-primary', bg: 'bg-primary/15 border-primary/30' },
  onboarded: { label: 'Onboarded', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  contract_signed: { label: 'Contract Signed', color: 'text-primary', bg: 'bg-primary/15 border-primary/30' },
  info_added: { label: 'Info Added', color: 'text-primary', bg: 'bg-primary/15 border-primary/30' },
  pending: { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-muted/30 border-muted' },
};

function externalStatusToDb(status: string): string {
  const map: Record<string, string> = {
    'Summer Ready': 'summer_ready',
    'Onboarded': 'onboarded',
    'Contract Signed': 'contract_signed',
    'Info Added': 'info_added',
  };
  return map[status] || 'pending';
}

function OnboardingStatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${info.color} ${info.bg}`}>
      {info.label}
    </Badge>
  );
}

interface RosterSyncTabProps {
  profiles: { user_id: string; full_name: string; email: string; direct_manager: string | null; status: string | null; avatar_url?: string | null; onboarding_status?: string | null }[];
  managers: { user_id: string; full_name: string }[];
  onRefresh: () => void;
}

interface MatchResult {
  externalName: string;
  externalManager: string;
  externalStatus: string;
  matchedProfile: { user_id: string; full_name: string; email: string; direct_manager: string | null; avatar_url?: string | null; onboarding_status?: string | null } | null;
  matchScore: number;
  managerInSystem: string | null;
}

interface ProfileDetail {
  user_id: string;
  full_name: string;
  email: string;
  direct_manager: string | null;
  avatar_url?: string | null;
  onboarding_status?: string | null;
  externalName: string;
  externalManager: string;
  externalStatus: string;
  matchScore: number;
  managerInSystem: string | null;
}

function ProfileCard({ result, onClick }: { result: MatchResult; onClick: () => void }) {
  const matched = result.matchedProfile;
  const isSynced = matched?.direct_manager === result.managerInSystem && result.managerInSystem;
  const dbStatus = externalStatusToDb(result.externalStatus);
  const statusSynced = matched?.onboarding_status === dbStatus;
  const notSummerReady = dbStatus !== 'summer_ready' && matched;
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <UserAvatar
            avatarUrl={matched?.avatar_url}
            fullName={result.externalName}
            size="md"
          />
          {notSummerReady && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
              <MinusCircle className="w-2.5 h-2.5 text-black" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {result.externalName}
          </p>
          {matched ? (
            <p className="text-[10px] text-primary/80 truncate">
              Matched → {matched.full_name} ({Math.round(result.matchScore * 100)}%)
            </p>
          ) : (
            <p className="text-[10px] text-primary/80">Not in app</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <OnboardingStatusBadge status={dbStatus} />
          {isSynced && statusSynced && <CheckCircle className="w-3 h-3 text-primary/60" />}
          {matched && !result.managerInSystem && <AlertTriangle className="w-3 h-3 text-primary/60" />}
        </div>
      </div>
    </button>
  );
}

function ProfileDetailModal({ 
  detail, 
  open, 
  onClose, 
  managers, 
  onSyncManager, 
  onAssignManager,
  onSyncStatus,
  syncing 
}: { 
  detail: ProfileDetail | null; 
  open: boolean; 
  onClose: () => void;
  managers: { user_id: string; full_name: string }[];
  onSyncManager: (result: MatchResult) => void;
  onAssignManager: (userId: string, managerName: string) => void;
  onSyncStatus: (userId: string, status: string) => void;
  syncing: Set<string>;
}) {
  if (!detail) return null;

  const isSynced = detail.direct_manager === detail.managerInSystem && detail.managerInSystem;
  const needsSync = detail.managerInSystem && detail.direct_manager !== detail.managerInSystem;
  const managerMissing = !detail.managerInSystem;
  const dbStatus = externalStatusToDb(detail.externalStatus);
  const statusSynced = detail.onboarding_status === dbStatus;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={detail.avatar_url}
              fullName={detail.externalName}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="block text-foreground">{detail.externalName}</span>
              <span className="text-xs text-muted-foreground">
                Match: <span className="text-primary">{detail.full_name}</span>
                <span className="text-white/30 ml-1">({Math.round(detail.matchScore * 100)}%)</span>
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Email */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-sm text-foreground">{detail.email}</p>
            </div>
          </div>

          {/* Onboarding Status */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Sun className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Onboarding Status</p>
              <div className="flex items-center gap-2 mt-1">
                <OnboardingStatusBadge status={detail.onboarding_status || 'pending'} />
                {!statusSynced && (
                  <>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <OnboardingStatusBadge status={dbStatus} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] ml-auto gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => onSyncStatus(detail.user_id, dbStatus)}
                    >
                      <Link2 className="w-3 h-3" /> Sync
                    </Button>
                  </>
                )}
                {statusSynced && <CheckCircle className="w-3 h-3 text-primary ml-auto" />}
              </div>
            </div>
          </div>

          {/* External Manager */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">External Manager</p>
              <p className="text-sm text-foreground">{detail.externalManager}</p>
            </div>
          </div>

          {/* Current Manager / Sync */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Manager in App</p>
            {isSynced ? (
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{detail.direct_manager}</span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Synced</Badge>
              </div>
            ) : needsSync ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{detail.direct_manager || '—'}</span>
                  <span className="text-[10px] text-primary">→ {detail.managerInSystem}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={syncing.has(detail.user_id)}
                  onClick={() => onSyncManager({
                    externalName: detail.externalName,
                    externalManager: detail.externalManager,
                    externalStatus: detail.externalStatus,
                    matchedProfile: { user_id: detail.user_id, full_name: detail.full_name, email: detail.email, direct_manager: detail.direct_manager },
                    matchScore: detail.matchScore,
                    managerInSystem: detail.managerInSystem,
                  })}
                >
                  {syncing.has(detail.user_id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  Sync to {detail.managerInSystem}
                </Button>
              </div>
            ) : managerMissing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-primary text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Manager "{detail.externalManager}" not found in app
                </div>
                <Select onValueChange={(v) => { onAssignManager(detail.user_id, v); onClose(); }}>
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                    <SelectValue placeholder="Assign manager manually..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map(m => (
                      <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-sm text-white/40">{detail.direct_manager || '—'}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RosterSyncTab({ profiles, managers, onRefresh }: RosterSyncTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'matched' | 'missing' | 'needs-manager' | 'not-summer-ready'>('all');
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [syncedAll, setSyncedAll] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);

  const matchResults = useMemo<MatchResult[]>(() => {
    return EXTERNAL_ROSTER.map(ext => {
      const match = findBestMatch(ext.full_name, profiles);
      let managerInSystem: string | null = null;
      for (const p of profiles) {
        const score = matchNames(p.full_name, ext.manager_name);
        if (score > 0.7) { managerInSystem = p.full_name; break; }
      }
      const matchedProf = match ? profiles.find(p => p.user_id === match.profile.user_id) : null;
      return {
        externalName: ext.full_name,
        externalManager: ext.manager_name,
        externalStatus: ext.status,
        matchedProfile: matchedProf ? { user_id: matchedProf.user_id, full_name: matchedProf.full_name, email: matchedProf.email, direct_manager: matchedProf.direct_manager, avatar_url: matchedProf.avatar_url, onboarding_status: matchedProf.onboarding_status } : null,
        matchScore: match?.score || 0,
        managerInSystem,
      };
    });
  }, [profiles]);

  const missingReps = matchResults.filter(r => !r.matchedProfile);
  const matchedReps = matchResults.filter(r => r.matchedProfile);
  const needsManagerAssignment = matchedReps.filter(r => {
    if (!r.matchedProfile) return false;
    return !r.matchedProfile.direct_manager || (r.managerInSystem && r.matchedProfile.direct_manager !== r.managerInSystem);
  });
  const notSummerReady = matchResults.filter(r => {
    const dbStatus = externalStatusToDb(r.externalStatus);
    return dbStatus !== 'summer_ready';
  });

  const filtered = useMemo(() => {
    let list = matchResults;
    if (filter === 'matched') list = matchedReps;
    if (filter === 'missing') list = missingReps;
    if (filter === 'needs-manager') list = needsManagerAssignment;
    if (filter === 'not-summer-ready') list = notSummerReady;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.externalName.toLowerCase().includes(q) ||
        r.externalManager.toLowerCase().includes(q) ||
        r.matchedProfile?.full_name.toLowerCase().includes(q) ||
        r.matchedProfile?.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [matchResults, filter, search, matchedReps, missingReps, needsManagerAssignment, notSummerReady]);

  const handleSyncManager = async (result: MatchResult) => {
    if (!result.matchedProfile || !result.managerInSystem) return;
    const key = result.matchedProfile.user_id;
    setSyncing(prev => new Set(prev).add(key));
    const { error } = await supabase.from('profiles').update({ direct_manager: result.managerInSystem } as any).eq('user_id', result.matchedProfile.user_id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Synced', description: `${result.matchedProfile.full_name} → ${result.managerInSystem}` });
    }
    setSyncing(prev => { const n = new Set(prev); n.delete(key); return n; });
    setSelectedProfile(null);
    onRefresh();
  };

  const handleSyncStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from('profiles').update({ onboarding_status: status } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status Synced' });
      setSelectedProfile(null);
      onRefresh();
    }
  };

  const handleSyncAll = async () => {
    setSyncedAll(true);
    const toSync = needsManagerAssignment.filter(r => r.matchedProfile && r.managerInSystem);
    let count = 0;
    for (const result of toSync) {
      if (!result.matchedProfile || !result.managerInSystem) continue;
      const { error } = await supabase.from('profiles').update({ direct_manager: result.managerInSystem } as any).eq('user_id', result.matchedProfile.user_id);
      if (!error) count++;
    }
    toast({ title: 'Bulk Sync Complete', description: `Updated ${count} manager assignments.` });
    setSyncedAll(false);
    onRefresh();
  };

  const handleSyncAllStatuses = async () => {
    setSyncedAll(true);
    let count = 0;
    for (const result of matchedReps) {
      if (!result.matchedProfile) continue;
      const dbStatus = externalStatusToDb(result.externalStatus);
      if (result.matchedProfile.onboarding_status === dbStatus) continue;
      const { error } = await supabase.from('profiles').update({ onboarding_status: dbStatus } as any).eq('user_id', result.matchedProfile.user_id);
      if (!error) count++;
    }
    toast({ title: 'Status Sync Complete', description: `Updated ${count} onboarding statuses.` });
    setSyncedAll(false);
    onRefresh();
  };

  const handleAssignManager = async (userId: string, managerName: string) => {
    const { error } = await supabase.from('profiles').update({ direct_manager: managerName } as any).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Assigned' });
      onRefresh();
    }
  };

  const copyMissingReps = () => {
    const text = missingReps.map(r => `${r.externalName} | Manager: ${r.externalManager} | Status: ${r.externalStatus}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${missingReps.length} missing reps copied to clipboard.` });
  };

  const handleCardClick = (result: MatchResult) => {
    if (result.matchedProfile) {
      setSelectedProfile({
        user_id: result.matchedProfile.user_id,
        full_name: result.matchedProfile.full_name,
        email: result.matchedProfile.email,
        direct_manager: result.matchedProfile.direct_manager,
        avatar_url: result.matchedProfile.avatar_url,
        onboarding_status: result.matchedProfile.onboarding_status,
        externalName: result.externalName,
        externalManager: result.externalManager,
        externalStatus: result.externalStatus,
        matchScore: result.matchScore,
        managerInSystem: result.managerInSystem,
      });
    } else {
      navigator.clipboard.writeText(`${result.externalName} | ${result.externalManager}`);
      toast({ title: 'Copied to clipboard', description: result.externalName });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { value: EXTERNAL_ROSTER.length, label: 'External Roster', color: 'text-foreground' },
          { value: matchedReps.length, label: 'Matched', color: 'text-primary' },
          { value: missingReps.length, label: 'Not In App', color: 'text-primary' },
          { value: needsManagerAssignment.length, label: 'Needs Manager', color: 'text-primary' },
          { value: notSummerReady.length, label: 'Not Summer Ready', color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roster..." className="pl-9 bg-white/5 border-white/10" />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-52 bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({EXTERNAL_ROSTER.length})</SelectItem>
            <SelectItem value="matched">Matched ({matchedReps.length})</SelectItem>
            <SelectItem value="missing">Not In App ({missingReps.length})</SelectItem>
            <SelectItem value="needs-manager">Needs Manager ({needsManagerAssignment.length})</SelectItem>
            <SelectItem value="not-summer-ready">Not Summer Ready ({notSummerReady.length})</SelectItem>
          </SelectContent>
        </Select>
        {filter === 'missing' && missingReps.length > 0 && (
          <Button onClick={copyMissingReps} variant="outline" className="gap-1.5 border-white/10 text-foreground hover:bg-white/5">
            <Copy className="w-3.5 h-3.5" /> Copy All Missing
          </Button>
        )}
        <div className="flex gap-2">
          {needsManagerAssignment.length > 0 && (
            <Button onClick={handleSyncAll} disabled={syncedAll} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              {syncedAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Sync Managers
            </Button>
          )}
          <Button onClick={handleSyncAllStatuses} disabled={syncedAll} variant="outline" className="gap-1.5 border-white/10 text-foreground hover:bg-white/5">
            {syncedAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sun className="w-3.5 h-3.5" />}
            Sync All Statuses
          </Button>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((result, i) => (
          <ProfileCard key={i} result={result} onClick={() => handleCardClick(result)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-white/30">No results found</div>
        )}
      </div>

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        detail={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        managers={managers}
        onSyncManager={handleSyncManager}
        onAssignManager={handleAssignManager}
        onSyncStatus={handleSyncStatus}
        syncing={syncing}
      />
    </div>
  );
}
