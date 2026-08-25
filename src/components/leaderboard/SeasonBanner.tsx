import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';

export interface Season {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  days_left: number;
}

export function useCurrentSeason() {
  const [season, setSeason] = useState<Season | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_current_season');
      if (!cancelled) setSeason(((data as Season[]) || [])[0] || null);
    })();
    return () => { cancelled = true; };
  }, []);

  return season;
}

/** Shows the active season above the leaderboard. Renders nothing when no season is defined. */
export function SeasonBanner() {
  const season = useCurrentSeason();
  if (!season) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4 px-3 py-2 rounded-xl bg-[#D4AF37]/[0.07] border border-[#D4AF37]/25">
      <CalendarRange className="w-3.5 h-3.5 text-[#D4AF37]" />
      <span className="text-[12px] font-bold uppercase tracking-micro text-[#D4AF37]">{season.name}</span>
      <span className="text-[11px] text-muted-foreground">
        {format(new Date(`${season.starts_on}T12:00:00`), 'MMM d')} – {format(new Date(`${season.ends_on}T12:00:00`), 'MMM d')}
        {season.days_left > 0 && ` · ${season.days_left} day${season.days_left === 1 ? '' : 's'} left`}
      </span>
    </div>
  );
}
