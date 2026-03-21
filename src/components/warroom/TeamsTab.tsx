import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { PillarTreeView } from '@/components/team/PillarTreeView';
import { getTeamColor } from '@/lib/teamColors';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { getEffectiveManager, PILLAR_OWNERS, assignPillarsToRoster, buildTree as buildHierarchyTree, isManager as checkIsManager, findPersonByName } from '@/lib/hierarchyUtils';
import type { TeamMember, Pillar } from '@/lib/hierarchyUtils';

export function TeamsTab({ managerName }: { managerName: string }) {
  const { profile, role } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());
  const [profilesRaw, setProfilesRaw] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, teamsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const profiles = profilesRes.data || [];
      const teams = teamsRes.data || [];
      const roles = rolesRes.data || [];
      setProfilesRaw(profiles);
      const managerIds = new Set(roles.filter(r => r.role === 'manager' || r.role === 'admin').map(r => r.user_id));
      setManagerRoles(managerIds);
      const members: TeamMember[] = profiles.map(p => ({
        id: p.id, user_id: p.user_id, full_name: p.full_name, email: p.email, phone: p.phone, status: p.status, experience: p.experience,
        direct_manager: getEffectiveManager(p.direct_manager), role: managerIds.has(p.user_id) ? 'manager' : 'rookie', isNLC: p.status === 'nlc',
        last_active_at: p.last_active_at, is_active_now: p.is_active_now, avatar_url: p.avatar_url, team_id: p.team_id,
      }));
      setAllMembers(members);
      setPillars(teams);
      setLoading(false);
    };
    fetchData();
  }, []);

  const visibleMembers = useMemo(() => allMembers.filter(m => m.status !== 'nlc' && (m as any).onboarding_status !== 'pending'), [allMembers]);
  const { enrichedRoster } = useMemo(() => {
    if (visibleMembers.length === 0 || pillars.length === 0) return { enrichedRoster: [] };
    return assignPillarsToRoster(visibleMembers, pillars);
  }, [visibleMembers, pillars]);

  const teamsWithRanking = useMemo(() => {
    const teamCounts = new Map<string, { managers: number; rookies: number }>();
    pillars.forEach(p => teamCounts.set(p.id, { managers: 0, rookies: 0 }));
    profilesRaw.forEach(p => {
      if (p.status === 'nlc' || !p.team_id) return;
      const counts = teamCounts.get(p.team_id);
      if (!counts) return;
      if (managerRoles.has(p.user_id)) counts.managers++; else counts.rookies++;
    });
    const teams = pillars.map(p => {
      const counts = teamCounts.get(p.id) || { managers: 0, rookies: 0 };
      const totalMembers = counts.managers + counts.rookies;
      const points = (counts.managers * 2) + counts.rookies;
      return { id: p.id, name: p.name, slug: p.slug, logo_url: (p as any).logo_url, totalMembers, managerCount: counts.managers, rookieCount: counts.rookies, points, rank: 0 };
    });
    teams.sort((a, b) => b.points - a.points);
    teams.forEach((t, i) => { t.rank = i + 1; });
    return teams;
  }, [pillars, profilesRaw, managerRoles]);

  const pillarData: Pillar[] = useMemo(() => {
    return pillars.map(p => {
      const ownerName = PILLAR_OWNERS[p.slug];
      const owner = findPersonByName(enrichedRoster, ownerName);
      const members = enrichedRoster.filter(m => m.pillar === p.slug);
      const managerCount = members.filter(m => checkIsManager(enrichedRoster, m.full_name) || m.role === 'manager').length;
      return { id: p.id, name: p.name, slug: p.slug, leader_id: p.leader_id, owner, members, totalCount: members.length, rookieCount: members.length - managerCount, managerCount };
    });
  }, [pillars, enrichedRoster]);

  const selectedPillarData = useMemo(() => selectedPillar ? pillarData.find(p => p.slug === selectedPillar) || null : null, [selectedPillar, pillarData]);
  const selectedTree = useMemo(() => {
    if (!selectedPillarData) return null;
    return buildHierarchyTree(enrichedRoster, PILLAR_OWNERS[selectedPillarData.slug]);
  }, [selectedPillarData, enrichedRoster]);

  if (loading) return <SummitLoader label="Loading team structure..." />;

  if (selectedPillar && selectedPillarData) {
    return (
      <PillarTreeView
        pillar={selectedPillarData}
        tree={selectedTree}
        roster={enrichedRoster.filter(m => m.pillar === selectedPillar)}
        onBack={() => setSelectedPillar(null)}
        logoUrl={pillars.find(p => p.slug === selectedPillar)?.logo_url}
      />
    );
  }

  return (
    <div className="space-y-4">
      {teamsWithRanking.map(team => {
        const tc = getTeamColor(team.name);
        return (
          <button key={team.id} onClick={() => setSelectedPillar(team.slug)} className="w-full flex items-center gap-4 px-4 py-4 bg-card rounded-xl border border-border/50 hover:border-primary/40 transition-all text-left group">
            {team.logo_url ? (
              <div className="w-12 h-12 rounded-xl border border-border/30 overflow-hidden bg-muted/30 flex-shrink-0">
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", tc.bgTint)}>
                <span className={cn("text-lg font-bold", tc.text)}>{team.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">{team.name}</span>
                <span className="text-xs text-muted-foreground">{team.totalMembers} members</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{team.managerCount} managers</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">{team.rookieCount} rookies</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
