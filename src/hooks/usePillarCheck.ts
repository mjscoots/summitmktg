 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 
 interface PillarCheckResult {
   isPillar: boolean;
   teamId: string | null;
   teamName: string | null;
   isLoading: boolean;
 }
 
 export function usePillarCheck(): PillarCheckResult {
   const { user, profile } = useAuth();
   const [isPillar, setIsPillar] = useState(false);
   const [teamId, setTeamId] = useState<string | null>(null);
   const [teamName, setTeamName] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(true);
 
   useEffect(() => {
     const checkPillarStatus = async () => {
       if (!user) {
         setIsLoading(false);
         return;
       }
 
       try {
         // Check if user is a team leader (pillar owner)
         const { data: team, error } = await supabase
           .from('teams')
           .select('id, name, slug')
           .eq('leader_id', user.id)
           .maybeSingle();
 
         if (!error && team) {
           setIsPillar(true);
           setTeamId(team.id);
           setTeamName(team.name);
         } else {
           setIsPillar(false);
           setTeamId(profile?.team_id || null);
           
           // Get team name if we have team_id
           if (profile?.team_id) {
             const { data: teamData } = await supabase
               .from('teams')
               .select('name')
               .eq('id', profile.team_id)
               .maybeSingle();
             setTeamName(teamData?.name || null);
           }
         }
       } catch (err) {
         console.error('Error checking pillar status:', err);
         setIsPillar(false);
       } finally {
         setIsLoading(false);
       }
     };
 
     checkPillarStatus();
   }, [user, profile?.team_id]);
 
   return { isPillar, teamId, teamName, isLoading };
 }