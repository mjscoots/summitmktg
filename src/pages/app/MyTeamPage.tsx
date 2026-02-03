import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamCard } from '@/components/team/TeamCard';
import { PillarTreeView } from '@/components/team/PillarTreeView';
import { MembersModal } from '@/components/team/MembersModal';
import { AnimatedEllipsis } from '@/components/team/AnimatedEllipsis';
import { useManagerNotifications } from '@/hooks/useManagerNotifications';
import {
  TeamMember,
  Pillar,
  PILLAR_OWNERS,
  normalizeName,
  findPersonByName,
  buildTree,
  isManager,
  assignPillarsToRoster,
  getEffectiveManager,
} from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';

interface TeamWithRanking {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  totalMembers: number;
  managerCount: number;
  rookieCount: number;
  points: number;
  rank: number;
}

export default function MyTeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string; leader_id: string | null; logo_url?: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [showNLC, setShowNLC] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerRoles, setManagerRoles] = useState<Set<string>>(new Set());

  const isAdmin = role === 'admin';
  const isManagerRole = role === 'manager' || role === 'admin';

  // Listen for manager notifications (real-time toasts)
  useManagerNotifications();

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;

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
        phone: p.phone,
        status: p.status,
        experience: p.experience,
        direct_manager: getEffectiveManager(p.direct_manager),
        role: managerUserIds.has(p.user_id) ? 'manager' : 'rookie',
        isNLC: p.status === 'nlc',
      }));

      setAllMembers(members);
      setPillars(teamsData || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  // Filter members based on NLC toggle
  const visibleMembers = useMemo(() => {
    if (showNLC) return allMembers;
    return allMembers.filter(m => m.status !== 'nlc');
  }, [allMembers, showNLC]);

  // Assign pillars to all members
  const { enrichedRoster, dataIssues } = useMemo(() => {
    if (visibleMembers.length === 0 || pillars.length === 0) {
      return { enrichedRoster: [], dataIssues: [] };
    }
    return assignPillarsToRoster(visibleMembers, pillars);
  }, [visibleMembers, pillars]);

  // Build pillar data with counts and ranking - ONLY count ACTIVE members for points
  const teamsWithRanking: TeamWithRanking[] = useMemo(() => {
    const teams = pillars.map(p => {
      // Get all members for this pillar (for display when NLC toggle is on)
      const allMembers = enrichedRoster.filter(m => m.pillar === p.slug);
      
      // Filter to ACTIVE members only for point calculation (exclude NLC)
      const activeMembers = allMembers.filter(m => m.status !== 'nlc');
      
      const managerCount = activeMembers.filter(m => 
        isManager(enrichedRoster, m.full_name) || m.role === 'manager'
      ).length;
      const rookieCount = activeMembers.length - managerCount;
      
      // Points: managers = 2, rookies = 1 (NLC = 0, excluded above)
      const points = (managerCount * 2) + (rookieCount * 1);
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        logo_url: p.logo_url,
        totalMembers: activeMembers.length, // Only show active count on cards
        managerCount,
        rookieCount,
        points,
        rank: 0,
      };
    });

    // Sort by points descending and assign ranks
    teams.sort((a, b) => b.points - a.points);
    teams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return teams;
  }, [pillars, enrichedRoster]);

  // Filter teams by search
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teamsWithRanking;
    const query = normalizeName(searchQuery);
    return teamsWithRanking.filter(t => 
      normalizeName(t.name).includes(query)
    );
  }, [teamsWithRanking, searchQuery]);

  // Build pillar data for tree view
  const pillarData: Pillar[] = useMemo(() => {
    return pillars.map(p => {
      const ownerName = PILLAR_OWNERS[p.slug];
      const owner = findPersonByName(enrichedRoster, ownerName);
      const members = enrichedRoster.filter(m => m.pillar === p.slug);
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

  // Total active members
  const totalActiveMembers = enrichedRoster.filter(m => m.status !== 'nlc').length;
  const nlcCount = allMembers.filter(m => m.status === 'nlc').length;

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
              {/* Title Row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    Summit Teams
                  </h1>
                  <p className="text-muted-foreground text-base mt-1">
                    Many join the race. Few reach the{' '}
                    <span className="text-primary font-semibold">top</span>.
                  </p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-2">
                  {/* Search Icon */}
                  {searchOpen ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() => !searchQuery && setSearchOpen(false)}
                        autoFocus
                        className="w-48 px-3 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}

                  {/* Members Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMembersModalOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Members
                  </Button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-xl font-bold text-foreground">{totalActiveMembers}</span>
                  <AnimatedEllipsis className="text-primary text-lg font-bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Managers:</span>
                  <span className="text-xl font-bold text-primary">{teamsWithRanking.reduce((sum, t) => sum + t.managerCount, 0)}</span>
                  <AnimatedEllipsis className="text-primary text-lg font-bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rookies:</span>
                  <span className="text-xl font-bold text-success">{teamsWithRanking.reduce((sum, t) => sum + t.rookieCount, 0)}</span>
                  <AnimatedEllipsis className="text-success text-lg font-bold" />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNLC(!showNLC)}
                  className={cn(
                    "gap-1.5 text-xs ml-auto",
                    showNLC && "bg-muted"
                  )}
                >
                  {showNLC ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  NLC ({nlcCount})
                </Button>
              </div>
            </div>
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
          // Team Cards Grid
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team, index) => (
              <div
                key={team.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TeamCard
                  team={team}
                  onClick={() => setSelectedPillar(team.slug)}
                  canUploadLogo={isManagerRole}
                  isAdmin={isAdmin}
                  onLogoUpdate={fetchData}
                />
              </div>
            ))}
          </div>
        )}

        {/* Members Modal */}
        <MembersModal 
          open={membersModalOpen} 
          onClose={() => setMembersModalOpen(false)} 
        />
      </main>
    </AppLayout>
  );
}