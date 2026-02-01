import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, ChevronDown, ChevronRight, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string | null;
  experience: string | null;
  direct_manager: string | null;
  lessonsCompleted: number;
  totalLessons: number;
}

export default function MyTeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!profile?.full_name) return;

      try {
        // Fetch profiles
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('status', 'nlc')
          .order('full_name');

        // If regular manager, only show people who report to them
        if (role === 'manager') {
          query = query.eq('direct_manager', profile.full_name);
        }

        const { data: profiles, error } = await query;

        if (error) {
          console.error('Error fetching team:', error);
          return;
        }

        // Get total lessons count once
        const { count: totalLessons } = await supabase
          .from('training_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get lesson progress for each user
        const membersWithProgress: TeamMember[] = [];

        for (const p of profiles || []) {
          const { count: completedLessons } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.user_id)
            .eq('quiz_passed', true);

          membersWithProgress.push({
            id: p.id,
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            status: p.status,
            experience: p.experience,
            direct_manager: p.direct_manager,
            lessonsCompleted: completedLessons || 0,
            totalLessons: totalLessons || 0,
          });
        }

        setTeamMembers(membersWithProgress);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchTeamMembers();
    }
  }, [profile, role, authLoading]);

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by direct manager for tree view
  const directReports = filteredMembers.filter(m => m.direct_manager === profile?.full_name);
  const otherMembers = filteredMembers.filter(m => m.direct_manager !== profile?.full_name);

  // Group others by their manager
  const groupedByManager = otherMembers.reduce((acc, member) => {
    const manager = member.direct_manager || 'Unassigned';
    if (!acc[manager]) acc[manager] = [];
    acc[manager].push(member);
    return acc;
  }, {} as Record<string, TeamMember[]>);

  const toggleManager = (manager: string) => {
    setExpandedManagers(prev => {
      const next = new Set(prev);
      if (next.has(manager)) {
        next.delete(manager);
      } else {
        next.add(manager);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-success/15 text-success' },
      onboarded: { label: 'Onboarded', className: 'bg-primary/15 text-primary' },
      contract_signed: { label: 'Contract Signed', className: 'bg-amber-500/15 text-amber-400' },
      info_added: { label: 'Info Added', className: 'bg-amber-500/15 text-amber-400' },
    };
    const s = statusMap[status || ''] || { label: 'Pending', className: 'bg-muted text-muted-foreground' };
    return (
      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', s.className)}>
        {s.label}
      </span>
    );
  };

  const getExperienceBadge = (exp: string | null) => {
    if (!exp) return null;
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
        {exp}
      </span>
    );
  };

  const MemberRow = ({ member }: { member: TeamMember }) => {
    const progressPercent = member.totalLessons > 0
      ? Math.round((member.lessonsCompleted / member.totalLessons) * 100)
      : 0;

    return (
      <div className="flex items-center gap-4 py-3 px-4 hover:bg-muted/30 transition-colors rounded-lg">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{member.full_name}</p>
          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {getExperienceBadge(member.experience)}
          {getStatusBadge(member.status)}
        </div>
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Users className="w-5 h-5 text-primary" />
            </div>
            My Team
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View everyone assigned under you
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading team...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border/50">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No team members match your search' : 'No team members found'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Direct Reports */}
            {directReports.length > 0 && (
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                  <h2 className="font-semibold text-foreground text-sm">
                    Direct Reports ({directReports.length})
                  </h2>
                </div>
                <div className="divide-y divide-border/30">
                  {directReports.map(member => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {/* Team Tree - For admins */}
            {role === 'admin' && Object.keys(groupedByManager).length > 0 && (
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                  <h2 className="font-semibold text-foreground text-sm">Team Tree</h2>
                </div>
                <div>
                  {Object.entries(groupedByManager).map(([manager, members]) => (
                    <div key={manager}>
                      <button
                        onClick={() => toggleManager(manager)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        {expandedManagers.has(manager) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{manager}</span>
                        <span className="text-xs text-muted-foreground">({members.length})</span>
                      </button>
                      {expandedManagers.has(manager) && (
                        <div className="pl-6 border-l-2 border-border/30 ml-4">
                          {members.map(member => (
                            <MemberRow key={member.id} member={member} />
                          ))}
                        </div>
                      )}
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
