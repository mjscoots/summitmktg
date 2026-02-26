import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TeamScript {
  id: string;
  team_id: string;
  module: string;
  script_content: string;
  last_edited_by: string | null;
  last_edited_at: string | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  leader_id: string | null;
}

export function useTeamScripts(moduleKey: string) {
  const { user, profile, role } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scripts, setScripts] = useState<Record<string, TeamScript>>({});
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userTeamId = profile?.team_id || null;
  const isAdmin = role === 'admin' || role === 'owner';

  // Check if user is a pillar owner
  const isPillarOwner = (teamId: string) => {
    if (isAdmin) return true;
    const team = teams.find(t => t.id === teamId);
    return team?.leader_id === user?.id;
  };

  const canEditScript = (teamId: string) => {
    return isPillarOwner(teamId);
  };

  // Fetch teams and scripts
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, slug, leader_id')
          .order('name');

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Set default selected team to user's team
        if (userTeamId && !selectedTeamId) {
          setSelectedTeamId(userTeamId);
        } else if (teamsData && teamsData.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teamsData[0].id);
        }

        // Fetch scripts for this module
        const { data: scriptsData, error: scriptsError } = await supabase
          .from('team_scripts')
          .select('*')
          .eq('module', moduleKey);

        if (scriptsError) throw scriptsError;

        // Map scripts by team_id
        const scriptsMap: Record<string, TeamScript> = {};
        scriptsData?.forEach(script => {
          scriptsMap[script.team_id] = script;
        });
        setScripts(scriptsMap);

      } catch (err) {
        console.error('Error fetching team scripts:', err);
        setError('Failed to load team scripts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for script changes
    const channel = supabase
      .channel(`team_scripts_${moduleKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_scripts',
          filter: `module=eq.${moduleKey}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScript = payload.new as TeamScript;
            setScripts(prev => ({
              ...prev,
              [newScript.team_id]: newScript,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, moduleKey, userTeamId]);

  // Save script
  const saveScript = async (teamId: string, content: string) => {
    if (!user || !canEditScript(teamId)) {
      setError('You do not have permission to edit this script');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const existingScript = scripts[teamId];

      if (existingScript) {
        // Update existing script
        const { error: updateError } = await supabase
          .from('team_scripts')
          .update({
            script_content: content,
            last_edited_by: user.id,
            last_edited_at: new Date().toISOString(),
          })
          .eq('id', existingScript.id);

        if (updateError) throw updateError;
      } else {
        // Insert new script
        const { error: insertError } = await supabase
          .from('team_scripts')
          .insert({
            team_id: teamId,
            module: moduleKey,
            script_content: content,
            last_edited_by: user.id,
            last_edited_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error saving script:', err);
      setError('Failed to save script');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const getScriptContent = (teamId: string): string => {
    return scripts[teamId]?.script_content || 'No script has been added for this team yet.';
  };

  const getSelectedTeam = () => {
    return teams.find(t => t.id === selectedTeamId) || null;
  };

  return {
    teams,
    scripts,
    selectedTeamId,
    setSelectedTeamId,
    isLoading,
    isSaving,
    error,
    saveScript,
    getScriptContent,
    getSelectedTeam,
    canEditScript,
    userTeamId,
  };
}
