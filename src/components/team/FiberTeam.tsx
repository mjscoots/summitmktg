import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const CARD = 'rounded-xl border border-border bg-card';

interface Region {
  id: string;
  name: string;
  lead_user_id: string | null;
}

interface Person {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  region_id: string | null;
}

function weekStart(): string {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function PersonRow({ p, installs, isLead }: { p: Person; installs: number; isLead?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 py-2">
      <button onClick={() => navigate(`/app/person/${p.user_id}`)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-xs text-foreground">
            {(p.full_name || '—').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <span className="min-w-0 truncate text-sm text-foreground">
          {p.full_name || 'Unnamed'}
          {isLead && <span className="ml-2 text-xs text-muted-foreground">Region lead</span>}
        </span>
      </button>
      <span className="tabular-nums text-sm text-primary">{installs}</span>
      {p.phone && (
        <a
          href={`tel:${p.phone}`}
          aria-label={`Call ${p.full_name || 'rep'}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
      <button
        onClick={() => navigate('/app/chat')}
        aria-label={`Message ${p.full_name || 'rep'}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Fiber team: region rosters with installs this week. No downline KPI. */
export function FiberTeam() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [installs, setInstalls] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, p, f] = await Promise.all([
        (supabase as any).from('regions').select('id, name, lead_user_id').order('name'),
        (supabase as any)
          .from('profiles')
          .select('user_id, full_name, avatar_url, phone, region_id')
          .eq('vertical', 'Fiber'),
        (supabase as any).rpc('get_fiber_leaderboard', { p_week_start: weekStart() }),
      ]);
      setRegions((r.data as Region[]) || []);
      setPeople((p.data as Person[]) || []);
      const map: Record<string, number> = {};
      ((f.data as { user_id: string; installs: number }[]) || []).forEach((row) => {
        map[row.user_id] = row.installs;
      });
      setInstalls(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;

  if (people.length === 0) {
    return (
      <section className={`${CARD} p-5`}>
        <p className="text-sm text-muted-foreground">No Fiber reps assigned yet.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {regions.map((region) => {
        const roster = people.filter((p) => p.region_id === region.id);
        const lead = roster.find((p) => p.user_id === region.lead_user_id) || null;
        const rest = roster.filter((p) => p.user_id !== region.lead_user_id);
        if (roster.length === 0) return null;
        return (
          <section key={region.id} className={`${CARD} p-5`}>
            <h2 className="mb-2 text-sm font-medium tracking-tight text-foreground">{region.name} region</h2>
            <div className="divide-y divide-border">
              {lead && <PersonRow p={lead} installs={installs[lead.user_id] || 0} isLead />}
              {rest.map((p) => (
                <PersonRow key={p.user_id} p={p} installs={installs[p.user_id] || 0} />
              ))}
            </div>

          </section>
        );
      })}
      {people.some((p) => !p.region_id) && (
        <section className={`${CARD} p-5`}>
          <h2 className="mb-2 text-sm font-medium tracking-tight text-foreground">No region set</h2>
          <div className="divide-y divide-border">
            {people
              .filter((p) => !p.region_id)
              .map((p) => (
                <PersonRow key={p.id} p={p} installs={installs[p.id] || 0} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default FiberTeam;
