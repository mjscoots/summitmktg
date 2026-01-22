import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Users, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string | null;
  created_at: string | null;
  lessonsCompleted: number;
  totalLessons: number;
}

export default function TeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!profile?.full_name) return;

      try {
        // Fetch profiles where recruiter matches this manager's name
        // For admins, fetch all non-NLC profiles
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('status', 'nlc')
          .order('full_name');

        if (role === 'manager') {
          query = query.eq('recruiter', profile.full_name);
        }

        const { data: profiles, error } = await query;

        if (error) {
          console.error('Error fetching team:', error);
          return;
        }

        // Get lesson progress for each user
        const membersWithProgress: TeamMember[] = [];

        for (const p of profiles || []) {
          // Get total lessons count
          const { count: totalLessons } = await supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

          // Get completed lessons for this user
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
            created_at: p.created_at,
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

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'onboarded':
        return <CheckCircle2 className="w-4 h-4 text-primary/70" />;
      case 'contract_signed':
      case 'info_added':
        return <Clock className="w-4 h-4 text-accent-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active': return 'Active';
      case 'onboarded': return 'Onboarded';
      case 'contract_signed': return 'Contract Signed';
      case 'info_added': return 'Info Added';
      default: return 'Pending';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Team Management
            </h1>
            <p className="text-muted-foreground mt-1">
              View and track your team's training progress
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
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
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No team members match your search' : 'No team members found'}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Training Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const progressPercent = member.totalLessons > 0
                        ? Math.round((member.lessonsCompleted / member.totalLessons) * 100)
                        : 0;

                      return (
                        <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{member.full_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground text-sm">{member.email}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(member.status)}
                              <span className="text-sm text-foreground">{getStatusLabel(member.status)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground min-w-[60px]">
                                {member.lessonsCompleted}/{member.totalLessons}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
