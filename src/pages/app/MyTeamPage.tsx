import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, AlertTriangle, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PillarCard } from '@/components/team/PillarCard';
import { PillarTreeView } from '@/components/team/PillarTreeView';
import { DataIssuesPanel } from '@/components/team/DataIssuesPanel';
import {
  TeamMember,
  Pillar,
  PILLAR_OWNERS,
  normalizeName,
  namesMatch,
  findPersonByName,
  buildTree,
  getDescendants,
  isManager,
  assignPillarsToRoster,
} from '@/lib/hierarchyUtils';

export default function MyTeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [showDataIssues, setShowDataIssues] = useState(true);
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all non-NLC profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .neq('status', 'nlc')
          .order('full_name');

        if (profilesError) throw profilesError;

        // Fetch pillars (teams)
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('name');

        if (teamsError) throw teamsError;

        // Fetch all user roles to identify managers
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role');

        const managerUserIds = new Set(
          (rolesData || [])
            .filter(r => r.role === 'manager' || r.role === 'admin')
            .map(r => r.user_id)
        );
        setManagerRoles(managerUserIds);

        const members: TeamMember[] = (profiles || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          status: p.status,
          experience: p.experience,
          direct_manager: p.direct_manager,
          role: managerUserIds.has(p.user_id) ? 'manager' : 'rookie',
        }));

        setAllMembers(members);
        setPillars(teamsData || []);
      } catch (err) {
        console.error('Error fetching team data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  // Assign pillars to all members
  const { enrichedRoster, dataIssues } = useMemo(() => {
    if (allMembers.length === 0 || pillars.length === 0) {
      return { enrichedRoster: [], dataIssues: [] };
    }
    return assignPillarsToRoster(allMembers, pillars);
  }, [allMembers, pillars]);

  // Build pillar data with counts
  const pillarData: Pillar[] = useMemo(() => {
    return pillars.map(p => {
      const ownerName = PILLAR_OWNERS[p.slug];
      const owner = findPersonByName(enrichedRoster, ownerName);
      const members = enrichedRoster.filter(m => m.pillar === p.slug);
      
      // Count managers vs rookies - anyone with direct reports is a "manager" in the tree
      const managerCount = members.filter(m => 
        isManager(enrichedRoster, m.full_name) || m.role === 'manager'
      ).length;
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        leader_id: p.leader_id,
        owner,
        members,
        totalCount: members.length,
        rookieCount: members.length - managerCount,
        managerCount,
      };
    });
  }, [pillars, enrichedRoster]);

  // Build tree for selected pillar
  const selectedPillarData = useMemo(() => {
    if (!selectedPillar) return null;
    return pillarData.find(p => p.slug === selectedPillar) || null;
  }, [selectedPillar, pillarData]);

  const selectedTree = useMemo(() => {
    if (!selectedPillarData) return null;
    const ownerName = PILLAR_OWNERS[selectedPillarData.slug];
    return buildTree(enrichedRoster, ownerName);
  }, [selectedPillarData, enrichedRoster]);

  // Filter pillars by search
  const filteredPillars = useMemo(() => {
    if (!searchQuery) return pillarData;
    const query = normalizeName(searchQuery);
    return pillarData.filter(p => 
      normalizeName(p.name).includes(query) ||
      (p.owner && normalizeName(p.owner.full_name).includes(query)) ||
      p.members.some(m => normalizeName(m.full_name).includes(query))
    );
  }, [pillarData, searchQuery]);

  // Unassigned members
  const unassignedMembers = enrichedRoster.filter(m => m.pillar === 'unassigned');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        {!selectedPillar && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/15">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                Team Pillars
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                View organizational structure by pillar
              </p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search pillars or members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Data Issues Panel */}
            {showDataIssues && dataIssues.length > 0 && (
              <div className="mb-6">
                <DataIssuesPanel 
                  issues={dataIssues} 
                  onClose={() => setShowDataIssues(false)} 
                />
              </div>
            )}
          </>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading team data...</div>
          </div>
        ) : selectedPillar && selectedPillarData ? (
          // Pillar Tree View
          <PillarTreeView
            pillar={selectedPillarData}
            tree={selectedTree}
            roster={enrichedRoster}
            onBack={() => setSelectedPillar(null)}
          />
        ) : (
          // Pillar Cards Grid
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-foreground">{enrichedRoster.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground">Pillars</p>
                <p className="text-2xl font-bold text-foreground">{pillars.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-2xl font-bold text-primary">
                  {enrichedRoster.filter(m => isManager(enrichedRoster, m.full_name)).length}
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground">Rookies</p>
                <p className="text-2xl font-bold text-success">
                  {enrichedRoster.filter(m => !isManager(enrichedRoster, m.full_name)).length}
                </p>
              </div>
            </div>

            {/* Pillar Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPillars.map(pillar => (
                <PillarCard
                  key={pillar.id}
                  pillar={pillar}
                  onClick={() => setSelectedPillar(pillar.slug)}
                />
              ))}
            </div>

            {/* Unassigned Section */}
            {unassignedMembers.length > 0 && (
              <div className="bg-card rounded-xl border border-amber-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-foreground">
                    Unassigned Members ({unassignedMembers.length})
                  </h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {unassignedMembers.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Manager: {member.direct_manager || 'None'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
