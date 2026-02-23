import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EXTERNAL_ROSTER, findBestMatch, matchNames } from '@/lib/externalRoster';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search, Copy, CheckCircle, AlertTriangle, UserPlus, Link2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RosterSyncTabProps {
  profiles: { user_id: string; full_name: string; email: string; direct_manager: string | null; status: string | null }[];
  managers: { user_id: string; full_name: string }[];
  onRefresh: () => void;
}

interface MatchResult {
  externalName: string;
  externalManager: string;
  externalStatus: string;
  matchedProfile: { user_id: string; full_name: string; email: string; direct_manager: string | null } | null;
  matchScore: number;
  managerInSystem: string | null; // The DB profile name of the manager
}

export default function RosterSyncTab({ profiles, managers, onRefresh }: RosterSyncTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'matched' | 'missing' | 'needs-manager'>('all');
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [syncedAll, setSyncedAll] = useState(false);

  // Build match results
  const matchResults = useMemo<MatchResult[]>(() => {
    return EXTERNAL_ROSTER.map(ext => {
      const match = findBestMatch(ext.full_name, profiles);

      // Find the manager in the system
      let managerInSystem: string | null = null;
      for (const p of profiles) {
        const score = matchNames(p.full_name, ext.manager_name);
        if (score > 0.7) {
          managerInSystem = p.full_name;
          break;
        }
      }

      return {
        externalName: ext.full_name,
        externalManager: ext.manager_name,
        externalStatus: ext.status,
        matchedProfile: match ? { ...match.profile, email: profiles.find(p => p.user_id === match.profile.user_id)?.email || '', direct_manager: profiles.find(p => p.user_id === match.profile.user_id)?.direct_manager || null } : null,
        matchScore: match?.score || 0,
        managerInSystem,
      };
    });
  }, [profiles]);

  const missingReps = matchResults.filter(r => !r.matchedProfile);
  const matchedReps = matchResults.filter(r => r.matchedProfile);
  const needsManagerAssignment = matchedReps.filter(r => {
    if (!r.matchedProfile) return false;
    // Manager not in system or direct_manager not set correctly
    return !r.matchedProfile.direct_manager || (r.managerInSystem && r.matchedProfile.direct_manager !== r.managerInSystem);
  });

  const filtered = useMemo(() => {
    let list = matchResults;
    if (filter === 'matched') list = matchedReps;
    if (filter === 'missing') list = missingReps;
    if (filter === 'needs-manager') list = needsManagerAssignment;

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
  }, [matchResults, filter, search, matchedReps, missingReps, needsManagerAssignment]);

  const handleSyncManager = async (result: MatchResult) => {
    if (!result.matchedProfile || !result.managerInSystem) return;
    const key = result.matchedProfile.user_id;
    setSyncing(prev => new Set(prev).add(key));

    const { error } = await supabase
      .from('profiles')
      .update({ direct_manager: result.managerInSystem })
      .eq('user_id', result.matchedProfile.user_id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Synced', description: `${result.matchedProfile.full_name} → ${result.managerInSystem}` });
    }

    setSyncing(prev => { const n = new Set(prev); n.delete(key); return n; });
    onRefresh();
  };

  const handleSyncAll = async () => {
    setSyncedAll(true);
    const toSync = needsManagerAssignment.filter(r => r.matchedProfile && r.managerInSystem);
    let count = 0;

    for (const result of toSync) {
      if (!result.matchedProfile || !result.managerInSystem) continue;
      const { error } = await supabase
        .from('profiles')
        .update({ direct_manager: result.managerInSystem })
        .eq('user_id', result.matchedProfile.user_id);
      if (!error) count++;
    }

    toast({ title: 'Bulk Sync Complete', description: `Updated ${count} manager assignments.` });
    setSyncedAll(false);
    onRefresh();
  };

  const handleAssignManager = async (userId: string, managerName: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ direct_manager: managerName })
      .eq('user_id', userId);

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

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-black text-foreground">{EXTERNAL_ROSTER.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">External Roster</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-black text-green-400">{matchedReps.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matched</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-black text-red-400">{missingReps.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Not In App</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-black text-amber-400">{needsManagerAssignment.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Needs Manager Sync</p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roster..." className="pl-9 bg-white/5 border-white/10" />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({EXTERNAL_ROSTER.length})</SelectItem>
            <SelectItem value="matched">Matched ({matchedReps.length})</SelectItem>
            <SelectItem value="missing">Not In App ({missingReps.length})</SelectItem>
            <SelectItem value="needs-manager">Needs Manager ({needsManagerAssignment.length})</SelectItem>
          </SelectContent>
        </Select>
        {filter === 'missing' && missingReps.length > 0 && (
          <Button onClick={copyMissingReps} variant="outline" className="gap-1.5 border-white/10 text-foreground hover:bg-white/5">
            <Copy className="w-3.5 h-3.5" /> Copy All Missing
          </Button>
        )}
        {needsManagerAssignment.length > 0 && (
          <Button onClick={handleSyncAll} disabled={syncedAll} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            {syncedAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Sync All Managers
          </Button>
        )}
      </div>

      {/* Results table */}
      <div className="border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">External Name</th>
              <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">App Profile</th>
              <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">External Manager</th>
              <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Current Manager</th>
              <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Ext. Status</th>
              <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((result, i) => {
              const isSynced = result.matchedProfile?.direct_manager === result.managerInSystem && result.managerInSystem;
              const needsSync = result.matchedProfile && result.managerInSystem && result.matchedProfile.direct_manager !== result.managerInSystem;
              const managerMissing = result.matchedProfile && !result.managerInSystem;

              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{result.externalName}</td>
                  <td className="px-4 py-3">
                    {result.matchedProfile ? (
                      <div>
                        <span className="text-green-400 text-xs font-medium">{result.matchedProfile.full_name}</span>
                        <span className="text-white/30 text-[10px] ml-1">({Math.round(result.matchScore * 100)}%)</span>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Not Found</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs">{result.externalManager}</td>
                  <td className="px-4 py-3">
                    {result.matchedProfile ? (
                      managerMissing ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <Select onValueChange={(v) => handleAssignManager(result.matchedProfile!.user_id, v)}>
                            <SelectTrigger className="h-7 w-40 bg-white/5 border-white/10 text-xs">
                              <SelectValue placeholder="Assign manager..." />
                            </SelectTrigger>
                            <SelectContent>
                              {managers.map(m => (
                                <SelectItem key={m.user_id} value={m.full_name} className="text-xs">{m.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : isSynced ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle className="w-3 h-3" /> {result.matchedProfile.direct_manager}
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs">{result.matchedProfile.direct_manager || '—'}</span>
                      )
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{result.externalStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {needsSync ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        disabled={syncing.has(result.matchedProfile!.user_id)}
                        onClick={() => handleSyncManager(result)}
                      >
                        {syncing.has(result.matchedProfile!.user_id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                        Sync
                      </Button>
                    ) : !result.matchedProfile ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                        onClick={() => {
                          navigator.clipboard.writeText(`${result.externalName} | ${result.externalManager}`);
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    ) : isSynced ? (
                      <span className="text-green-400/50 text-[10px]">✓ Synced</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No results found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
