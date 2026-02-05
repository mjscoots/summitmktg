import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  team_id: string | null;
  status: string;
   last_active_at?: string | null;
   is_active_now?: boolean;
   time_this_week_minutes?: number;
}

interface TeamMemberWithProgress extends TeamMember {
  trainingProgress: number;
  totalLessons: number;
  completedLessons: number;
}

interface TeamData {
  teamId: string | null;
  teamName: string | null;
  members: TeamMemberWithProgress[];
  topPerformers: TeamMemberWithProgress[];
  needsAttention: TeamMemberWithProgress[];
   needsCheckIn: TeamMemberWithProgress[];
  completionRate: number;
  isLoading: boolean;
  error: string | null;
}

export function useTeamData(): TeamData {
  const { user, profile, role } = useAuth();
  const [members, setMembers] = useState<TeamMemberWithProgress[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';
  const teamId = profile?.team_id || null;

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user || !isManager) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, check if user is a pillar owner (team leader)
        let isPillarOwner = false;
        let pillarTeamId = teamId;
        let pillarTeamName = null;

        if (teamId) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, name, leader_id')
            .eq('id', teamId)
            .maybeSingle();

          if (teamData) {
            isPillarOwner = teamData.leader_id === user.id;
            pillarTeamName = teamData.name;
          }
        }

        // For admins not on a team, or non-pillar managers, show direct reports
        let memberQuery = supabase
          .from('profiles')
           .select('id, user_id, full_name, email, avatar_url, team_id, status, last_active_at, is_active_now, time_this_week_minutes')
          .neq('status', 'nlc');

        if (isPillarOwner && pillarTeamId) {
          // Pillar owner: show all members of their team
          memberQuery = memberQuery.eq('team_id', pillarTeamId);
          setTeamName(pillarTeamName);
        } else if (profile?.full_name) {
          // Manager: show direct reports
          memberQuery = memberQuery.eq('direct_manager', profile.full_name);
          setTeamName(`${profile.full_name.split(' ')[0]}'s Team`);
        } else {
          setIsLoading(false);
          return;
        }

        const { data: membersData, error: membersError } = await memberQuery
          .order('last_active_at', { ascending: false, nullsFirst: false });

        if (membersError) {
          console.error('Error fetching team members:', membersError);
          setError('Failed to load team members');
          setIsLoading(false);
          return;
        }

        // Get training progress for each member
        const membersWithProgress = await Promise.all(
          (membersData || []).map(async (member) => {
            // Get total lessons (use a reasonable approximation)
            const { count: totalLessons } = await supabase
              .from('training_lessons')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true);

            // Get completed lessons for this user
            const { count: completedLessons } = await supabase
              .from('lesson_progress')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', member.user_id)
              .not('completed_at', 'is', null);

            const total = totalLessons || 0;
            const completed = completedLessons || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return {
              ...member,
              trainingProgress: progress,
              totalLessons: total,
              completedLessons: completed,
            };
          })
        );

        setMembers(membersWithProgress);
      } catch (err) {
        console.error('Error in fetchTeamData:', err);
        setError('Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [user, profile, isManager, teamId]);

  // Calculate derived data
  const topPerformers = [...members]
    .filter(m => m.status === 'active')
    .sort((a, b) => b.trainingProgress - a.trainingProgress)
    .slice(0, 3);

  const needsAttention = [...members]
    .filter(m => m.status === 'active' && m.trainingProgress < 50)
    .sort((a, b) => a.trainingProgress - b.trainingProgress)
    .slice(0, 3);

   // Members inactive for 24+ hours
   const needsCheckIn = [...members]
     .filter(m => {
       if (m.status !== 'active') return false;
       if (!m.last_active_at) return true;
       const hoursSinceActive = (Date.now() - new Date(m.last_active_at).getTime()) / (1000 * 60 * 60);
       return hoursSinceActive >= 24;
     })
     .sort((a, b) => {
       const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
       const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
       return aTime - bTime; // Oldest first
     })
     .slice(0, 3);
 
  const activeMembers = members.filter(m => m.status === 'active');
  const completionRate = activeMembers.length > 0
    ? Math.round(activeMembers.reduce((sum, m) => sum + m.trainingProgress, 0) / activeMembers.length)
    : 0;

  return {
    teamId,
    teamName,
    members,
    topPerformers,
    needsAttention,
     needsCheckIn,
    completionRate,
    isLoading,
    error,
  };
}
