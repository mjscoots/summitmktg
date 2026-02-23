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

        let membersData: any[] = [];

        if (isPillarOwner) {
          // Pillar owner: use get_pillar_team_members RPC for full downline
          setTeamName(pillarTeamName);
          const { data: pillarMembers, error: pillarError } = await supabase
            .rpc('get_pillar_team_members', { _pillar_user_id: user.id });

          if (pillarError) {
            console.error('Error fetching pillar team members:', pillarError);
            setError('Failed to load team members');
            setIsLoading(false);
            return;
          }

          // Map RPC result to match expected shape
          membersData = (pillarMembers || []).map((m: any) => ({
            id: m.profile_id,
            user_id: m.user_id,
            full_name: m.full_name,
            email: m.email,
            avatar_url: m.avatar_url,
            team_id: null,
            status: m.status || 'active',
            last_active_at: m.last_active_at,
            is_active_now: m.is_active_now,
            time_this_week_minutes: m.time_this_week_minutes,
          }));
        } else if (profile?.full_name) {
          // Manager: use get_user_downline RPC for full recursive downline
          setTeamName(`${profile.full_name.split(' ')[0]}'s Team`);
          const { data: downline, error: downlineError } = await supabase
            .rpc('get_user_downline', { _manager_name: profile.full_name });

          if (downlineError) {
            console.error('Error fetching downline:', downlineError);
            setError('Failed to load team members');
            setIsLoading(false);
            return;
          }

          if (downline && downline.length > 0) {
            // Fetch full profile data for downline members
            const downlineUserIds = downline.map((d: any) => d.user_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, user_id, full_name, email, avatar_url, team_id, status, last_active_at, is_active_now, time_this_week_minutes')
              .in('user_id', downlineUserIds)
              .neq('status', 'nlc')
              .order('last_active_at', { ascending: false, nullsFirst: false });

            membersData = profilesData || [];
          }
        } else {
          setIsLoading(false);
          return;
        }

        // Get training progress with batch queries instead of N+1
        const memberUserIds = (membersData || []).map(m => m.user_id);

        // Get reachable lesson IDs from active rookie courses only
        const { data: courses } = await supabase
          .from('training_courses')
          .select(`
            id,
            target_role,
            training_modules (
              id,
              training_lessons (
                id,
                is_active
              )
            )
          `)
          .eq('is_active', true);

        const reachableLessonIds = new Set<string>();
        (courses || []).forEach(course => {
          // Only count rookie-accessible courses (target_role is null or 'rookie')
          if (course.target_role !== null && course.target_role !== 'rookie') return;
          course.training_modules?.forEach(mod => {
            mod.training_lessons?.forEach(lesson => {
              if ((lesson as any).is_active !== false) {
                reachableLessonIds.add(lesson.id);
              }
            });
          });
        });

        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('user_id, lesson_id')
          .in('user_id', memberUserIds.length > 0 ? memberUserIds : ['__none__'])
          .not('completed_at', 'is', null);

        const total = reachableLessonIds.size;
        // Count completions per user (only reachable lessons)
        const completionMap = new Map<string, number>();
        (progressData || []).forEach(p => {
          if (reachableLessonIds.has(p.lesson_id)) {
            completionMap.set(p.user_id, (completionMap.get(p.user_id) || 0) + 1);
          }
        });

        const membersWithProgress = (membersData || []).map(member => {
          const completed = completionMap.get(member.user_id) || 0;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            ...member,
            trainingProgress: progress,
            totalLessons: total,
            completedLessons: completed,
          };
        });

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
