import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SeasonChecklistItem {
  id: string;
  label: string;
}

export interface SeasonRosterMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  office_name: string | null;
}

export interface SeasonHub {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  housing_notes: string | null;
  travel_notes: string | null;
  checklist: SeasonChecklistItem[];
  roster: SeasonRosterMember[];
}

export function useSeasonHub() {
  const [season, setSeason] = useState<SeasonHub | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_season_hub' as never, {} as never);
    if (error) {
      setSeason(null);
    } else {
      setSeason((data as unknown as SeasonHub) || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { season, loading, refresh: load };
}
