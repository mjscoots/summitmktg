import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle, Loader2, Users, Shield,
  GitBranch, RefreshCw, Monitor, MonitorOff, UserX, Link2, Merge,
  Database, Activity, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchNames } from '@/lib/externalRoster';
import { getCanonicalName, normalizeName, namesMatch, PILLAR_OWNERS, isTopAdmin, getEffectiveManager } from '@/lib/hierarchyUtils';

interface AuditProfile {
  user_id: string;
  full_name: string;
  email: string;
  direct_manager: string | null;
  status: string | null;
  approved: boolean | null;
  team_id: string | null;
  onboarding_status: string | null;
  last_active_at: string | null;
  created_at: string | null;
  recruiter: string | null;
}

interface AuditStats {
  totalUsers: number;
  inApp: number;
  falseInApp: number;
  noManager: number;
  noTeam: number;
  noEdge: number;
  nlc: number;
  orphaned: number;
  duplicatePairs: DuplicatePair[];
}

interface DuplicatePair {
  a: AuditProfile;
  b: AuditProfile;
  score: number;
  canAutoMerge: boolean;
}

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
}

function isPlaceholder(p: AuditProfile): boolean {
  if (!p.last_active_at || !p.created_at) return true;
  return Math.abs(new Date(p.last_active_at).getTime() - new Date(p.created_at).getTime()) < 60000;
}

export default function AdminAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [edges, setEdges] = useState<{ parent_user_id: string; child_user_id: string }[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fixingInApp, setFixingInApp] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{ edges_synced: number; teams_fixed: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, eRes, tRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, direct_manager, status, approved, team_id, onboarding_status, last_active_at, created_at, recruiter'),
      supabase.from('downline_edges').select('parent_user_id, child_user_id').eq('edge_type', 'manages'),
      supabase.from('teams').select('id, name, slug'),
    ]);
    setProfiles(pRes.data || []);
    setEdges(eRes.data || []);
    setTeams(tRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const edgeChildSet = useMemo(() => new Set(edges.map(e => e.child_user_id)), [edges]);
  const edgeParentSet = useMemo(() => new Set(edges.map(e => e.parent_user_id)), [edges]);

  // Build a name→profile lookup using fuzzy matching
  const profileNameMap = useMemo(() => {
    const map = new Map<string, AuditProfile>();
    for (const p of profiles) {
      map.set(p.full_name.toLowerCase().trim(), p);
      // Also index by first+last
      const parts = p.full_name.toLowerCase().trim().split(/\s+/);
      if (parts.length >= 2) {
        map.set(`${parts[0]} ${parts[parts.length - 1]}`, p);
      }
    }
    return map;
  }, [profiles]);

  // Find manager profile for a direct_manager text using fuzzy matching
  const findManagerProfile = useCallback((managerText: string): AuditProfile | null => {
    const norm = managerText.toLowerCase().trim();
    // Exact match
    const exact = profileNameMap.get(norm);
    if (exact) return exact;
    // First+last match
    const parts = norm.split(/\s+/);
    if (parts.length >= 2) {
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
      const fl = profileNameMap.get(firstLast);
      if (fl) return fl;
    }
    // Canonical name match
    const canonical = getCanonicalName(managerText);
    const cn = profileNameMap.get(canonical.toLowerCase().trim());
    if (cn) return cn;
    // Fuzzy matchNames
    for (const p of profiles) {
      if (matchNames(p.full_name, managerText) >= 0.85) return p;
    }
    return null;
  }, [profileNameMap, profiles]);

  const stats: AuditStats = useMemo(() => {
    const active = profiles.filter(p => p.status !== 'nlc');
    const falseInApp = profiles.filter(p =>
      p.approved === true && isPlaceholder(p)
    );
    const noManager = active.filter(p => !p.direct_manager && !isTopAdmin(p.full_name));
    const noTeam = active.filter(p => !p.team_id && !isTopAdmin(p.full_name));
    const noEdge = active.filter(p => !edgeChildSet.has(p.user_id) && !isTopAdmin(p.full_name));

    // Find duplicate names using nickname-aware matching
    const duplicatePairs: DuplicatePair[] = [];
    const checked = new Set<string>();
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const a = profiles[i];
        const b = profiles[j];
        const key = [a.user_id, b.user_id].sort().join('|');
        if (checked.has(key)) continue;
        checked.add(key);
        const score = matchNames(a.full_name, b.full_name);
        if (score >= 0.85) {
          duplicatePairs.push({
            a, b, score,
            canAutoMerge: isPlaceholder(a) || isPlaceholder(b),
          });
        }
      }
    }

    // Orphaned: have manager text but manager not found even with fuzzy matching
    const orphaned = active.filter(p => {
      if (!p.direct_manager || isTopAdmin(p.full_name)) return false;
      return !findManagerProfile(p.direct_manager);
    });

    return {
      totalUsers: profiles.length,
      inApp: profiles.filter(p => p.approved === true).length,
      falseInApp: falseInApp.length,
      noManager: noManager.length,
      noTeam: noTeam.length,
      noEdge: noEdge.length,
      nlc: profiles.filter(p => p.status === 'nlc').length,
      orphaned: orphaned.length,
      duplicatePairs,
    };
  }, [profiles, edgeChildSet, findManagerProfile]);

  // Pillar stats
  const pillarStats = useMemo(() => {
    return teams.map(t => {
      const members = profiles.filter(p => p.team_id === t.id);
      const active = members.filter(m => m.status === 'active');
      const inApp = members.filter(m => m.approved === true);
      const notInApp = members.filter(m => m.approved !== true);
      const noEdge = active.filter(m => !edgeChildSet.has(m.user_id) && !isTopAdmin(m.full_name));
      return {
        ...t,
        total: members.length,
        active: active.length,
        inApp: inApp.length,
        notInApp: notInApp.length,
        noEdge: noEdge.length,
        nlc: members.filter(m => m.status === 'nlc').length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [profiles, teams, edgeChildSet]);

  // Server-side auto-sync using the new DB function
  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc('auto_sync_all_edges');
      if (error) throw error;
      const result = data as { edges_synced: number; teams_fixed: number; errors: number };
      setLastSyncResult({ edges_synced: result.edges_synced, teams_fixed: result.teams_fixed });
      toast({
        title: 'Auto-Sync Complete',
        description: `${result.edges_synced} edges synced, ${result.teams_fixed} teams fixed`,
      });
    } catch (err: any) {
      // Fallback to client-side sync
      let synced = 0;
      let errors = 0;
      const activeWithManagerNoEdge = profiles.filter(p =>
        p.status !== 'nlc' && p.direct_manager && !edgeChildSet.has(p.user_id) && !isTopAdmin(p.full_name)
      );
      for (const p of activeWithManagerNoEdge) {
        const manager = findManagerProfile(p.direct_manager!);
        if (!manager) continue;
        await supabase.from('downline_edges').delete().eq('child_user_id', p.user_id).eq('edge_type', 'manages');
        const { error } = await supabase.from('downline_edges').insert({
          parent_user_id: manager.user_id, child_user_id: p.user_id, edge_type: 'manages',
        });
        if (error) errors++; else synced++;
      }
      toast({
        title: 'Auto-Sync Complete (client-side)',
        description: `${synced} edges created, ${errors} errors`,
      });
    }
    setSyncing(false);
    fetchData();
  };

  // Fix false in-app flags
  const handleFixInApp = async () => {
    setFixingInApp(true);
    const falseInApp = profiles.filter(p => p.approved === true && isPlaceholder(p));
    let fixed = 0;
    for (const p of falseInApp) {
      const { error } = await supabase.from('profiles')
        .update({ approved: null } as never)
        .eq('user_id', p.user_id);
      if (!error) fixed++;
    }
    toast({ title: 'In-App Status Fixed', description: `${fixed} false in-app flags corrected` });
    setFixingInApp(false);
    fetchData();
  };

  // Auto-fix team assignment from manager's team
  const handleFixTeams = async () => {
    setSyncing(true);
    let fixed = 0;
    const noTeamProfiles = profiles.filter(p => !p.team_id && p.status !== 'nlc');
    for (const p of noTeamProfiles) {
      // Find manager via edge or text
      const edge = edges.find(e => e.child_user_id === p.user_id);
      let managerTeamId: string | null = null;
      if (edge) {
        const manager = profiles.find(m => m.user_id === edge.parent_user_id);
        managerTeamId = manager?.team_id || null;
      } else if (p.direct_manager) {
        const manager = findManagerProfile(p.direct_manager);
        managerTeamId = manager?.team_id || null;
      }
      if (managerTeamId) {
        const { error } = await supabase.from('profiles')
          .update({ team_id: managerTeamId } as never)
          .eq('user_id', p.user_id);
        if (!error) fixed++;
      }
    }
    toast({ title: 'Teams Fixed', description: `${fixed} users assigned to their manager's team` });
    setSyncing(false);
    fetchData();
  };

  // Merge duplicate profiles
  const handleMerge = async (pair: DuplicatePair) => {
    const aIsPlaceholder = isPlaceholder(pair.a);
    const bIsPlaceholder = isPlaceholder(pair.b);
    const primary = aIsPlaceholder && !bIsPlaceholder ? pair.b : pair.a;
    const secondary = primary.user_id === pair.a.user_id ? pair.b : pair.a;
    setMerging(secondary.user_id);
    try {
      await supabase.from('downline_edges').update({ parent_user_id: primary.user_id } as never).eq('parent_user_id', secondary.user_id);
      const existingChildEdge = edges.find(e => e.child_user_id === primary.user_id);
      if (!existingChildEdge) {
        const secondaryEdge = edges.find(e => e.child_user_id === secondary.user_id);
        if (secondaryEdge) {
          await supabase.from('downline_edges').insert({ parent_user_id: secondaryEdge.parent_user_id, child_user_id: primary.user_id, edge_type: 'manages' });
        }
      }
      await supabase.from('downline_edges').delete().eq('child_user_id', secondary.user_id);
      const { data: primaryBc } = await supabase.from('bootcamp_progress').select('id').eq('user_id', primary.user_id).maybeSingle();
      if (!primaryBc) {
        await supabase.from('bootcamp_progress').update({ user_id: primary.user_id } as never).eq('user_id', secondary.user_id);
      } else {
        await supabase.from('bootcamp_progress').delete().eq('user_id', secondary.user_id);
      }
      await supabase.from('user_roles').delete().eq('user_id', secondary.user_id);
      await supabase.from('profiles').delete().eq('user_id', secondary.user_id);
      toast({ title: 'Profiles Merged', description: `"${secondary.full_name}" merged into "${primary.full_name}"` });
    } catch {
      toast({ title: 'Merge failed', variant: 'destructive' });
    }
    setMerging(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const healthScore = Math.max(0, 100 - (stats.falseInApp * 2) - (stats.noManager) - (stats.noTeam) - (stats.orphaned * 3) - (stats.duplicatePairs.length * 5));

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className={cn(
        "rounded-xl border p-4 flex items-center gap-4",
        healthScore >= 80 ? "bg-primary/5 border-primary/30" :
        healthScore >= 50 ? "bg-primary/5 border-primary/30" :
        "bg-destructive/5 border-destructive/30"
      )}>
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black",
          healthScore >= 80 ? "bg-primary/15 text-primary" :
          healthScore >= 50 ? "bg-primary/15 text-primary" :
          "bg-destructive/15 text-destructive"
        )}>
          {healthScore}
        </div>
        <div>
          <h3 className="font-bold text-foreground">Data Health Score</h3>
          <p className="text-xs text-muted-foreground">
            {healthScore >= 80 ? "Looking good — minor issues to address" :
             healthScore >= 50 ? "Several issues need attention" :
             "Critical issues detected — run repairs"}
          </p>
        </div>
      </div>

      {/* Last Sync Result */}
      {lastSyncResult && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary">
          <Zap className="w-3.5 h-3.5 inline mr-1" />
          Last sync: {lastSyncResult.edges_synced} edges synced, {lastSyncResult.teams_fixed} teams fixed
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard label="In-App" value={stats.inApp} icon={Monitor} color="emerald" />
        <StatCard label="False In-App" value={stats.falseInApp} icon={AlertTriangle} color={stats.falseInApp > 0 ? 'red' : 'green'} />
        <StatCard label="No Manager" value={stats.noManager} icon={UserX} color={stats.noManager > 0 ? 'amber' : 'green'} />
        <StatCard label="No Team" value={stats.noTeam} icon={Users} color={stats.noTeam > 0 ? 'amber' : 'green'} />
        <StatCard label="No Edge (Unsynced)" value={stats.noEdge} icon={Link2} color={stats.noEdge > 0 ? 'amber' : 'green'} />
        <StatCard label="NLC" value={stats.nlc} icon={MonitorOff} color="muted" />
        <StatCard label="Orphaned Manager Ref" value={stats.orphaned} icon={AlertTriangle} color={stats.orphaned > 0 ? 'red' : 'green'} />
      </div>

      {/* Duplicate Pairs */}
      {stats.duplicatePairs.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Potential Duplicates ({stats.duplicatePairs.length} pairs)
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.duplicatePairs.map((pair, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-background/50 rounded-md px-3 py-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{pair.a.full_name}</span>
                  <span className="text-muted-foreground mx-1">↔</span>
                  <span className="font-medium text-foreground">{pair.b.full_name}</span>
                  <span className="text-muted-foreground ml-2">({Math.round(pair.score * 100)}% match)</span>
                  {pair.a.status === 'nlc' && <span className="ml-1 text-primary">(NLC)</span>}
                  {pair.b.status === 'nlc' && <span className="ml-1 text-primary">(NLC)</span>}
                </div>
                {pair.canAutoMerge ? (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1"
                    disabled={merging === pair.a.user_id || merging === pair.b.user_id}
                    onClick={() => handleMerge(pair)}>
                    {merging === pair.a.user_id || merging === pair.b.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                    Merge
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Both active — review manually</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* One-Click Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleAutoSync} disabled={syncing} className="gap-2" variant="outline">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          Auto-Sync Edges & Teams
        </Button>
        <Button onClick={handleFixTeams} disabled={syncing || stats.noTeam === 0} className="gap-2" variant="outline">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Fix Missing Teams ({stats.noTeam})
        </Button>
        <Button onClick={handleFixInApp} disabled={fixingInApp || stats.falseInApp === 0} className="gap-2" variant="outline">
          {fixingInApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Fix False In-App ({stats.falseInApp})
        </Button>
        <Button onClick={fetchData} variant="ghost" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Pillar Overview */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Pillar Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pillarStats.map(p => (
            <div key={p.id} className="bg-card/50 border border-border/30 rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-foreground text-sm">{p.name}</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-foreground font-medium">{p.total}</span>
                <span className="text-muted-foreground">Active:</span>
                <span className="text-primary font-medium">{p.active}</span>
                <span className="text-muted-foreground">In-App:</span>
                <span className="text-primary font-medium">{p.inApp}</span>
                <span className="text-muted-foreground">Not In-App:</span>
                <span className="text-muted-foreground font-medium">{p.notInApp}</span>
                <span className="text-muted-foreground">NLC:</span>
                <span className="text-primary font-medium">{p.nlc}</span>
                {p.noEdge > 0 && (
                  <>
                    <span className="text-primary">⚠ Unsynced:</span>
                    <span className="text-primary font-medium">{p.noEdge}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned users (no team) */}
      {stats.noTeam > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Users Without Team ({stats.noTeam})</h3>
          <div className="bg-card/30 rounded-lg border border-border/30 overflow-x-auto">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Manager</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Suggested Team</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter(p => !p.team_id && p.status !== 'nlc' && !isTopAdmin(p.full_name))
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map(p => {
                      // Try to find suggested team from manager
                      let suggestedTeam = '—';
                      if (p.direct_manager) {
                        const manager = findManagerProfile(p.direct_manager);
                        if (manager?.team_id) {
                          const team = teams.find(t => t.id === manager.team_id);
                          suggestedTeam = team?.name || '—';
                        }
                      }
                      return (
                        <tr key={p.user_id} className="border-b border-border/10">
                          <td className="px-3 py-1.5 text-foreground">{p.full_name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]">{p.email}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{p.direct_manager || '—'}</td>
                          <td className="px-3 py-1.5">
                            {suggestedTeam !== '—' ? (
                              <span className="text-primary font-medium">{suggestedTeam}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orphaned Manager References */}
      {stats.orphaned > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Orphaned Manager References ({stats.orphaned})</h3>
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">These users reference a manager that doesn't exist in the system:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {profiles
                .filter(p => p.status !== 'nlc' && p.direct_manager && !isTopAdmin(p.full_name) && !findManagerProfile(p.direct_manager))
                .slice(0, 30)
                .map(p => (
                  <div key={p.user_id} className="flex items-center gap-2 text-xs">
                    <span className="text-foreground font-medium">{p.full_name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-destructive font-medium">"{p.direct_manager}"</span>
                    <span className="text-muted-foreground">(not found)</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'primary' }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    emerald: 'text-primary bg-primary/10',
    amber: 'text-primary bg-primary/10',
    red: 'text-primary bg-red-500/10',
    green: 'text-primary bg-primary/10',
    muted: 'text-muted-foreground bg-muted',
  };

  return (
    <div className="bg-card/50 border border-border/30 rounded-lg p-3 flex items-center gap-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorMap[color] || colorMap.primary)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}
