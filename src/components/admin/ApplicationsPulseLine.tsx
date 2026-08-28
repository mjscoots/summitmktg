import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Pulse {
  waiting: number;
  oldest_hours: number;
  unclaimed: number;
}

/** One live line above Requests: what is waiting, how old, how much has no owner. */
export function ApplicationsPulseLine() {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.rpc('applications_pulse' as never).then(({ data }) => {
      if (!alive) return;
      setPulse((data as unknown as Pulse) || null);
    });
    return () => { alive = false; };
  }, []);

  if (!pulse || pulse.waiting === 0) return null;

  return (
    <p className="mb-3 text-[13px] text-muted-foreground tabular-nums">
      <span className="text-foreground">{pulse.waiting}</span> application{pulse.waiting === 1 ? '' : 's'} waiting
      {' · oldest '}<span className="text-foreground">{pulse.oldest_hours}h</span>
      {' · '}<span className="text-foreground">{pulse.unclaimed}</span> unclaimed
    </p>
  );
}

export default ApplicationsPulseLine;
