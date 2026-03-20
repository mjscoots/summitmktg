import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle, Loader2, Users, Shield,
  GitBranch, RefreshCw, Monitor, MonitorOff, UserX, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  duplicateNames: string[];
}

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
}

export default function AdminAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [edges, setEdges] = useState<{ parent_user_id: string; child_user_id: string }[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [fixingInApp, setFixingInApp] = useState(false);

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

  const stats: AuditStats = useMemo(() => {
    const active = profiles.filter(p => p.status !== 'nlc');
    const falseInApp = profiles.filter(p =>
      p.approved === true &&
      p.last_active_at && p.created_at &&
      Math.abs(new Date(p.last_active_at).getTime() - new Date(p.created_at).getTime()) < 60000
    );
    const noManager = active.filter(p => !p.direct_manager && !isTopAdmin(p.full_name));
    const noTeam = active.filter(p => !p.team_id && !isTopAdmin(p.full_name));
    const noEdge = active.filter(p => !edgeChildSet.has(p.user_id) && !isTopAdmin(p.full_name));

    // Find duplicate names
    const nameCounts = new Map<string, number>();
    profiles.forEach(p => {
      const n = normalizeName(p.full_name);
      nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
    });
    const duplicateNames = Array.from(nameCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    // Orphaned: have manager text but manager not found
    const profileNames = new Set(profiles.map(p => normalizeName(getCanonicalName(p.full_name))));
    const orphaned = active.filter(p => {
      if (!p.direct_manager || isTopAdmin(p.full_name)) return false;
      const effective = getEffectiveManager(p.direct_manager);
      if (!effective) return false;
      const isPillarOwner = Object.values(PILLAR_OWNERS).some(o => namesMatch(effective, o));
      if (isPillarOwner || isTopAdmin(effective)) return false;
      return !profileNames.has(normalizeName(getCanonicalName(effective)));
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
      duplicateNames,
    };
  }, [profiles, edgeChildSet]);

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

  // Auto-sync: try to create edges for users that have direct_manager but no edge
  const handleAutoSync = async () => {
    setSyncing(true);
    let synced = 0;
    let errors = 0;

    const activeWithManagerNoEdge = profiles.filter(p =>
      p.status !== 'nlc' &&
      p.direct_manager &&
      !edgeChildSet.has(p.user_id) &&
      !isTopAdmin(p.full_name)
    );

    for (const p of activeWithManagerNoEdge) {
      const effective = getEffectiveManager(p.direct_manager!);
      if (!effective) continue;

      const manager = profiles.find(m =>
        normalizeName(getCanonicalName(m.full_name)) === normalizeName(getCanonicalName(effective))
      );
      if (!manager) continue;

      // Delete existing edges for this child
      await supabase.from('downline_edges').delete()
        .eq('child_user_id', p.user_id).eq('edge_type', 'manages');

      const { error } = await supabase.from('downline_edges').insert({
        parent_user_id: manager.user_id,
        child_user_id: p.user_id,
        edge_type: 'manages',
      });

      if (error) errors++;
      else synced++;
    }

    toast({
      title: 'Auto-Sync Complete',
      description: `${synced} edges created, ${errors} errors, ${activeWithManagerNoEdge.length - synced - errors} unresolvable`,
    });
    setSyncing(false);
    fetchData();
  };

  // Fix false in-app flags
  const handleFixInApp = async () => {
    setFixingInApp(true);
    const falseInApp = profiles.filter(p =>
      p.approved === true &&
      p.last_active_at && p.created_at &&
      Math.abs(new Date(p.last_active_at).getTime() - new Date(p.created_at).getTime()) < 60000
    );

    let fixed = 0;
    for (const p of falseInApp) {
      const { error } = await supabase.from('profiles')
        .update({ approved: null } as never)
        .eq('user_id', p.user_id);
      if (!error) fixed++;
    }

    toast({
      title: 'In-App Status Fixed',
      description: `${fixed} false in-app flags corrected`,
    });
    setFixingInApp(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {stats.duplicateNames.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Duplicate Names Detected</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.duplicateNames.join(', ')}
          </p>
        </div>
      )}

      {/* One-Click Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleAutoSync}
          disabled={syncing || stats.noEdge === 0}
          className="gap-2"
          variant="outline"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          Auto-Sync Edges ({stats.noEdge})
        </Button>
        <Button
          onClick={handleFixInApp}
          disabled={fixingInApp || stats.falseInApp === 0}
          className="gap-2"
          variant="outline"
        >
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
                <span className="text-emerald-400 font-medium">{p.active}</span>
                <span className="text-muted-foreground">In-App:</span>
                <span className="text-primary font-medium">{p.inApp}</span>
                <span className="text-muted-foreground">Not In-App:</span>
                <span className="text-muted-foreground font-medium">{p.notInApp}</span>
                <span className="text-muted-foreground">NLC:</span>
                <span className="text-red-400 font-medium">{p.nlc}</span>
                {p.noEdge > 0 && (
                  <>
                    <span className="text-amber-400">⚠ Unsynced:</span>
                    <span className="text-amber-400 font-medium">{p.noEdge}</span>
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
          <div className="bg-card/30 rounded-lg border border-border/30 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Manager</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter(p => !p.team_id && p.status !== 'nlc' && !isTopAdmin(p.full_name))
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map(p => (
                      <tr key={p.user_id} className="border-b border-border/10">
                        <td className="px-3 py-1.5 text-foreground">{p.full_name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]">{p.email}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{p.direct_manager || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium',
                            p.approved === true ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {p.approved === true ? 'In-App' : 'Not In-App'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
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
