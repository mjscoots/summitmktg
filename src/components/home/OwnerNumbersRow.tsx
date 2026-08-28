import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useResignHero } from '@/hooks/useSeasonMode';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

/**
 * Owner and admin only: three live numbers the business actually runs on.
 * Each one taps through to the screen that fixes it. Zero renders as 0.
 */
export function OwnerNumbersRow() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const staffOnly = role === 'owner' || role === 'admin';
  const resign = useResignHero(staffOnly);
  const [dark30, setDark30] = useState(0);
  const [apps, setApps] = useState(0);

  useEffect(() => {
    if (!staffOnly) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('owner_week');
      if (!alive || !data) return;
      const w = data as Record<string, number>;
      setDark30(Number(w.dark_30 || 0));
      setApps(Number(w.apps_waiting || 0));
    })();
    return () => { alive = false; };
  }, [staffOnly]);

  if (!staffOnly) return null;

  const cells: { label: string; value: string; to: string }[] = [
    {
      label: 'Signed for 2027',
      value: resign.rosterTotal > 0 ? `${resign.signed} of ${resign.rosterTotal}` : String(resign.signed),
      to: '/app/leads',
    },
    { label: 'Dark 30 days or more', value: String(dark30), to: '/admin/people?tab=seats' },
    { label: 'Applications waiting', value: String(apps), to: '/admin/requests' },

  ];

  return (
    <section>
      <SectionEyebrow>The numbers</SectionEyebrow>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => navigate(c.to)}
            className="card-ice flex min-h-20 flex-col justify-center gap-1 px-3 py-3 text-left"
          >
            <span className="text-[20px] font-bold leading-none tabular-nums text-foreground">{c.value}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default OwnerNumbersRow;
