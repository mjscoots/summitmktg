import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  GitBranch,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getCanonicalName,
  getEffectiveManager,
  normalizeName,
  PILLAR_OWNERS,
  findPersonByName,
  isTopAdmin,
  namesMatch,
} from '@/lib/hierarchyUtils';

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  direct_manager: string | null;
  status: string | null;
  team_id: string | null;
  avatar_url?: string | null;
  onboarding_status?: string | null;
  recruiter?: string | null;
}

interface HierarchySyncTabProps {
  profiles: Profile[];
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onRefresh: () => void;
}

interface UnresolvedPerson {
  profile: Profile;
  currentManager: string | null;
  suggestedManager: string | null;
  suggestedTeam: string | null;
  reason: string;
}

function resolveTeamFromManager(
  managerName: string | null,
  profiles: Profile[],
  teams: { id: string; name: string }[],
  visited = new Set<string>()
): string | null {
  if (!managerName) return null;

  const canonical = getCanonicalName(managerName);
  const normCanonical = normalizeName(canonical);

  if (visited.has(normCanonical)) return null;
  visited.add(normCanonical);

  // Check if manager is a pillar owner → return that team
  for (const [slug, ownerName] of Object.entries(PILLAR_OWNERS)) {
    if (namesMatch(canonical, ownerName)) {
      const team = teams.find(
        (t) => t.name.toLowerCase().replace(/\s+/g, '-') === slug || normalizeName(t.name) === normalizeName(slug.replace(/-/g, ' '))
      );
      return team?.id || null;
    }
  }

  // Find manager profile and use their team
  const managerProfile = profiles.find(
    (p) => normalizeName(getCanonicalName(p.full_name)) === normCanonical
  );

  if (managerProfile?.team_id) return managerProfile.team_id;

  // Recurse up
  if (managerProfile?.direct_manager) {
    return resolveTeamFromManager(managerProfile.direct_manager, profiles, teams, visited);
  }

  return null;
}

export default function HierarchySyncTab({
  profiles,
  managers,
  teams,
  onRefresh,
}: HierarchySyncTabProps) {
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});

  // Auto-resolve hierarchy and find unresolved exceptions
  const { autoResolved, unresolved, stats } = useMemo(() => {
    const autoResolved: { profile: Profile; resolvedManager: string; resolvedTeam: string | null }[] = [];
    const unresolved: UnresolvedPerson[] = [];
    let alreadyCorrect = 0;

    for (const p of profiles) {
      // Skip root admin
      if (isTopAdmin(p.full_name)) {
        alreadyCorrect++;
        continue;
      }

      // Skip pillar owners (they report to root)
      const canonical = getCanonicalName(p.full_name);
      const isPillarOwner = Object.values(PILLAR_OWNERS).some((o) => namesMatch(canonical, o));
      if (isPillarOwner) {
        alreadyCorrect++;
        continue;
      }

      const rawManager = p.direct_manager || p.recruiter;
      const effectiveManager = rawManager ? getEffectiveManager(rawManager) : null;

      // If no manager at all
      if (!effectiveManager) {
        unresolved.push({
          profile: p,
          currentManager: null,
          suggestedManager: null,
          suggestedTeam: null,
          reason: 'No manager or recruiter assigned',
        });
        continue;
      }

      // Check if effective manager exists in profiles
      const managerProfile = profiles.find(
        (m) =>
          normalizeName(getCanonicalName(m.full_name)) === normalizeName(effectiveManager)
      );

      const managerIsKnownPillarOwner = Object.values(PILLAR_OWNERS).some((o) =>
        namesMatch(effectiveManager, o)
      );

      if (!managerProfile && !managerIsKnownPillarOwner && !isTopAdmin(effectiveManager)) {
        // Manager not found in system
        // Try to find a fuzzy suggestion
        const normEff = normalizeName(effectiveManager);
        const parts = normEff.split(' ');
        let suggestion: string | null = null;

        if (parts.length >= 2) {
          const firstName = parts[0];
          const lastName = parts[parts.length - 1];
          const candidates = managers.filter((m) => {
            const mNorm = normalizeName(m.full_name);
            return mNorm.includes(firstName) && mNorm.includes(lastName);
          });
          if (candidates.length === 1) suggestion = candidates[0].full_name;
        }

        unresolved.push({
          profile: p,
          currentManager: rawManager,
          suggestedManager: suggestion,
          suggestedTeam: suggestion ? resolveTeamFromManager(suggestion, profiles, teams) : null,
          reason: `Manager "${rawManager}" not found in system`,
        });
        continue;
      }

      // Manager exists - check if direct_manager field is correct canonical form
      const correctManagerName = effectiveManager;
      const needsManagerUpdate = p.direct_manager !== correctManagerName;

      // Resolve team
      const resolvedTeam = resolveTeamFromManager(correctManagerName, profiles, teams);
      const needsTeamUpdate = resolvedTeam && p.team_id !== resolvedTeam;

      if (needsManagerUpdate || needsTeamUpdate) {
        autoResolved.push({
          profile: p,
          resolvedManager: correctManagerName,
          resolvedTeam: resolvedTeam,
        });
      } else {
        alreadyCorrect++;
      }
    }

    return {
      autoResolved,
      unresolved,
      stats: { alreadyCorrect, autoResolvable: autoResolved.length, unresolvable: unresolved.length },
    };
  }, [profiles, managers, teams]);

  // Helper: find manager user_id from name
  const findManagerUserId = (managerName: string): string | null => {
    const normTarget = normalizeName(getCanonicalName(managerName));
    const match = profiles.find(
      (p) => normalizeName(getCanonicalName(p.full_name)) === normTarget
    );
    return match?.user_id || null;
  };

  // Helper: upsert downline edge (child → parent)
  const syncDownlineEdge = async (childUserId: string, managerName: string) => {
    const managerUserId = findManagerUserId(managerName);
    if (!managerUserId) return;

    // Remove any existing 'manages' edges for this child
    await supabase
      .from('downline_edges')
      .delete()
      .eq('child_user_id', childUserId)
      .eq('edge_type', 'manages');

    // Insert the new edge
    await supabase
      .from('downline_edges')
      .insert({
        parent_user_id: managerUserId,
        child_user_id: childUserId,
        edge_type: 'manages',
      });
  };

  const handleAutoSync = async () => {
    setBulkSyncing(true);
    let updated = 0;
    let errors = 0;

    for (const item of autoResolved) {
      const updates: Record<string, string | null> = {};

      if (item.resolvedManager && item.profile.direct_manager !== item.resolvedManager) {
        updates.direct_manager = item.resolvedManager;
      }
      if (item.resolvedTeam && item.profile.team_id !== item.resolvedTeam) {
        updates.team_id = item.resolvedTeam;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates as never)
          .eq('user_id', item.profile.user_id);

        if (error) {
          errors++;
        } else {
          // Sync the downline edge so the manager sees this rep
          await syncDownlineEdge(item.profile.user_id, item.resolvedManager);
          updated++;
        }
      }
    }

    toast({
      title: 'Auto-Sync Complete',
      description: `Updated ${updated} profiles${errors > 0 ? `, ${errors} errors` : ''}`,
    });
    setBulkSyncing(false);
    onRefresh();
  };

  const handleSaveOne = async (userId: string, managerName: string) => {
    setSaving((prev) => new Set(prev).add(userId));

    const resolvedTeam = resolveTeamFromManager(managerName, profiles, teams);
    const updates: Record<string, string | null> = {
      direct_manager: managerName,
    };
    if (resolvedTeam) updates.team_id = resolvedTeam;

    const { error } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manager Assigned', description: `Team auto-resolved.` });
    }

    setSaving((prev) => {
      const n = new Set(prev);
      n.delete(userId);
      return n;
    });
    setManualSelections((prev) => {
      const n = { ...prev };
      delete n[userId];
      return n;
    });
    onRefresh();
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'None';
    return teams.find((t) => t.id === teamId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-card/50 rounded-xl border border-border/30 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.alreadyCorrect}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Already Correct</p>
        </div>
        <div className="p-4 bg-card/50 rounded-xl border border-border/30 text-center">
          <GitBranch className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.autoResolvable}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-Resolvable</p>
        </div>
        <div className="p-4 bg-card/50 rounded-xl border border-border/30 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.unresolvable}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Needs Manual Fix</p>
        </div>
      </div>

      {/* Auto-Resolve Action */}
      {stats.autoResolvable > 0 && (
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {stats.autoResolvable} profiles can be auto-synced
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manager names will be canonicalized and teams derived from hierarchy
              </p>
            </div>
            <Button
              onClick={handleAutoSync}
              disabled={bulkSyncing}
              className="gap-1.5"
            >
              {bulkSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitBranch className="w-3.5 h-3.5" />
              )}
              Auto-Sync All
            </Button>
          </div>
        </div>
      )}

      {/* Unresolved List */}
      {unresolved.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">All hierarchy resolved</p>
          <p className="text-xs text-muted-foreground mt-1">
            Every person is connected to a manager chain
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-foreground">
              Unresolved ({unresolved.length})
            </h3>
            <p className="text-xs text-muted-foreground">— assign a manager to fix</p>
          </div>

          {unresolved.map((item) => (
            <div
              key={item.profile.user_id}
              className="p-4 bg-card/40 rounded-xl border border-border/30 space-y-3"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={item.profile.avatar_url}
                  fullName={item.profile.full_name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.profile.full_name}
                  </p>
                  <p className="text-[10px] text-amber-400">{item.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Current Team</p>
                  <p className="text-xs text-foreground">{getTeamName(item.profile.team_id)}</p>
                </div>
              </div>

              {item.suggestedManager && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Suggested:</span>
                  <span className="text-xs font-medium text-emerald-400">
                    {item.suggestedManager}
                  </span>
                  {item.suggestedTeam && (
                    <>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {getTeamName(item.suggestedTeam)}
                      </span>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={saving.has(item.profile.user_id)}
                    onClick={() => handleSaveOne(item.profile.user_id, item.suggestedManager!)}
                  >
                    {saving.has(item.profile.user_id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Select
                  value={manualSelections[item.profile.user_id] || ''}
                  onValueChange={(v) =>
                    setManualSelections((prev) => ({ ...prev, [item.profile.user_id]: v }))
                  }
                >
                  <SelectTrigger className="h-8 bg-background/60 text-xs flex-1">
                    <SelectValue placeholder="Select Direct Manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.user_id} value={m.full_name} className="text-xs">
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  disabled={
                    !manualSelections[item.profile.user_id] ||
                    saving.has(item.profile.user_id)
                  }
                  onClick={() =>
                    handleSaveOne(
                      item.profile.user_id,
                      manualSelections[item.profile.user_id]
                    )
                  }
                >
                  {saving.has(item.profile.user_id) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
