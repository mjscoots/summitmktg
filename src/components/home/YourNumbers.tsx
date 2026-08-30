import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useRecruitGate } from '@/hooks/useRecruitGate';
import { useManagerOwed } from '@/hooks/useManagerOwed';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { OwnerNumbersRow } from '@/components/home/OwnerNumbersRow';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';
import { ResignIntentCard } from '@/components/home/ResignIntentCard';
import { YourThreeCard } from '@/components/home/YourThreeCard';
import { SupraTicketCard } from '@/components/home/SupraTicketCard';


import { Button } from '@/components/ui/button';


interface MyNumbers {
  has_lead?: boolean;
  rep_year?: string | null;
  signed_2027?: boolean;
  season_revenue?: number;
  blitz_rsvps?: number;
  supra_tickets?: number;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/** The recruit still inside the day one course sees only the course. */
function RecruitBlock() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const gate = useRecruitGate();
  const [trainer, setTrainer] = useState<string | null>(null);

  const managerId = (profile as { manager_id?: string | null } | null)?.manager_id || null;

  useEffect(() => {
    if (!managerId) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name')
        .eq('user_id', managerId)
        .maybeSingle();
      if (alive) setTrainer((data as { full_name: string } | null)?.full_name || null);
    })();
    return () => { alive = false; };
  }, [managerId]);

  if (gate.isLoading || !gate.is_recruit || gate.total === 0) return null;
  const next = gate.items.find((i) => !i.done);
  const pct = Math.round((gate.done / gate.total) * 100);

  return (
    <section>
      <SectionEyebrow>Your course</SectionEyebrow>
      <div className="card-ice p-4">
        <p className="text-[15px] font-semibold text-foreground">
          {gate.done} of {gate.total} watched
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'hsl(var(--workspace-accent))' }}
          />
        </div>
        {next && (
          <p className="mt-2 truncate text-[14px] text-muted-foreground">Next: {next.title}</p>
        )}
        {trainer && <p className="mt-0.5 text-[13px] text-muted-foreground">Trainer: {trainer}</p>}
        <Button className="mt-3 min-h-11 w-full" onClick={() => navigate('/recruit-course')}>
          Open the course
        </Button>
      </div>
    </section>
  );
}

/** One tap into the prep form for a named rep the manager actually has. */
function ManagerBlock() {
  const navigate = useNavigate();
  const { owed } = useManagerOwed();
  const [rep, setRep] = useState<{ user_id: string; full_name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('prep_roster');
      const rows = (data as { user_id: string; full_name: string }[]) || [];
      if (alive && rows.length > 0) setRep(rows[0]);
    })();
    return () => { alive = false; };
  }, []);

  const cells = [
    owed.one_on_ones_missing > 0
      ? { label: 'One on ones due', value: String(owed.one_on_ones_missing), to: '/app/one-on-ones/prep' }
      : null,
    owed.reps_no_training > 0
      ? { label: 'Reps with no training', value: String(owed.reps_no_training), to: '/app/team' }
      : null,
    owed.calls_due > 0
      ? { label: 'Re-sign calls due', value: String(owed.calls_due), to: '/app/leads' }
      : null,
  ].filter(Boolean) as { label: string; value: string; to: string }[];

  if (cells.length === 0 && !rep) return null;

  return (
    <section>
      <SectionEyebrow>Your team</SectionEyebrow>
      {cells.length > 0 && (
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
      )}
      {rep && (
        <Button
          variant="outline"
          className="mt-2 min-h-11 w-full"
          onClick={() => navigate('/app/one-on-ones/prep')}
        >
          Prep {rep.full_name.split(' ')[0]}
        </Button>
      )}
    </section>
  );
}

/**
 * Pass 130 — your numbers, scoped to who is looking. Anything without real data
 * behind it does not render, so nobody ever reads a zero on Home.
 */
export function YourNumbers() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const staff = isManagerOrAbove(role);
  const ownerTier = role === 'owner' || role === 'admin';
  const gate = useRecruitGate();
  const adminCounts = useAdminCounts();
  const [mine, setMine] = useState<MyNumbers | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('my_home_numbers');
      if (alive) setMine((data as MyNumbers) || null);
    })();
    return () => { alive = false; };
  }, []);

  if (!gate.isLoading && gate.is_recruit && gate.locked) return <RecruitBlock />;

  const signed = mine?.signed_2027 === true;
  const unsigned = mine?.has_lead === true && !signed;
  const revenue = Number(mine?.season_revenue || 0);
  const tickets = Number(mine?.supra_tickets || 0);

  const personal: { label: string; value: string; to: string }[] = [];
  if (signed) personal.push({ label: 'Your 2027 seat', value: 'Signed', to: '/app/season' });
  if (revenue > 0) personal.push({ label: 'Your season', value: money(revenue), to: '/app/money' });

  const showPersonal = personal.length > 0 || unsigned;


  return (
    <div className="space-y-8">
      {ownerTier && (
        <div className="space-y-2">
          <OwnerNumbersRow />
          {adminCounts.total > 0 && (
            <button
              type="button"
              onClick={() => navigate('/admin/requests')}
              className="card-ice flex min-h-11 w-full items-center gap-2 px-4 text-left"
            >
              <span className="text-[14px] text-foreground">Needs you</span>
              <span
                className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums"
                style={{
                  background: 'hsl(var(--workspace-accent) / 0.16)',
                  color: 'hsl(var(--workspace-accent))',
                }}
              >
                {adminCounts.total}
              </span>
            </button>
          )}
        </div>
      )}

      {showPersonal && (
        <section>
          <SectionEyebrow>Your numbers</SectionEyebrow>
          {personal.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {personal.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => navigate(c.to)}
                  className="card-ice flex min-h-20 flex-col justify-center gap-1 px-3 py-3 text-left"
                >
                  <span className="text-[18px] font-bold leading-none tabular-nums text-foreground">{c.value}</span>
                  <span className="text-[11px] leading-tight text-muted-foreground">{c.label}</span>
                </button>
              ))}
            </div>
          )}
          {unsigned && (
            <Button className="mt-2 min-h-11 w-full" onClick={() => navigate('/app/season')}>
              Start your 2027 paperwork
            </Button>
          )}
        </section>
      )}

      <SupraTicketCard tickets={tickets} />


      <ResignIntentCard eligible={mine?.has_lead === true && !signed && !gate.is_recruit} />

      <YourThreeCard />


      {staff && <ManagerBlock />}
    </div>

  );
}

export default YourNumbers;
