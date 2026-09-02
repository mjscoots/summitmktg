import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Network } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface Person {
  user_id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface Manager extends Person {
  accepting: boolean;
  capacity: number | null;
  mentee_count: number;
  rep_count: number;
  region_name?: string | null;
}

interface Rep extends Person {
  partner_name: string | null;
}

interface RegionManager extends Person {
  reps: Rep[];
}

interface Region {
  id: string;
  name: string;
  lead: Person | null;
  rep_count: number;
  managers: RegionManager[];
}

interface StackData {
  owner: Person | null;
  verticals: {
    vertical: string;
    label: string;
    lead: Person | null;
    total_reps: number;
    regions: Region[];
    managers: Manager[];
  }[];
}

const initials = (n?: string | null) =>
  (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/** Owner-only view of the whole machine: leads, managers, and rep counts per industry. */
export function StackView() {
  const [data, setData] = useState<StackData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: res } = await supabase.rpc('get_the_stack' as never);
      setData((res as unknown as StackData) || null);
    })();
  }, []);

  if (!data) return null;

  const goTo = (userId: string) => navigate(`/app/team?member=${userId}`);

  return (
    <section className={CARD}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Network className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">The Stack</h2>
      </div>

      {data.owner && (
        <button
          type="button"
          onClick={() => goTo(data.owner!.user_id)}
          className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/[0.06] p-3 text-left"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={data.owner.avatar_url || undefined} />
            <AvatarFallback className="text-[11px]">{initials(data.owner.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{data.owner.full_name}</p>
            <p className="micro-label">Owner</p>
          </div>
        </button>
      )}

      <div className="mt-3 space-y-3">
        {data.verticals.map((v) => (
          <div key={v.vertical} className="rounded-lg border border-border/50 bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-foreground">{v.label}</p>
              <p className="text-[12px] text-muted-foreground tabular-nums">{v.total_reps} reps</p>
            </div>

            {v.lead ? (
              <button
                type="button"
                onClick={() => goTo(v.lead!.user_id)}
                className="mt-2 flex w-full items-center gap-2 text-left"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={v.lead.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{initials(v.lead.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[13px] text-foreground">{v.lead.full_name}</p>
                  <p className="micro-label">Industry lead</p>
                </div>
              </button>
            ) : (
              <p className="mt-2 text-[12px] text-muted-foreground">No industry lead designated.</p>
            )}

            {(v.regions || []).length > 0 && (
              <div className="mt-3 space-y-2 border-l border-border/50 pl-3">
                {v.regions.map((g) => (
                  <div key={g.id} className="rounded-lg border border-border/50 bg-card/40 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-foreground">
                        {v.label} Lead - {g.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground tabular-nums">{g.rep_count} reps</p>
                    </div>
                    {g.lead ? (
                      <button
                        type="button"
                        onClick={() => goTo(g.lead!.user_id)}
                        className="mt-1.5 flex w-full items-center gap-2 text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={g.lead.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials(g.lead.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-foreground">{g.lead.full_name}</span>
                      </button>
                    ) : (
                      <p className="mt-1.5 text-[12px] text-muted-foreground">No region lead assigned.</p>
                    )}

                    {g.managers.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 border-l border-border/50 pl-3">
                        {g.managers.map((m) => (
                          <li key={m.user_id}>
                            <button
                              type="button"
                              onClick={() => goTo(m.user_id)}
                              className="flex w-full items-center gap-2 text-left"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={m.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">{initials(m.full_name)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate text-[13px] text-foreground">{m.full_name}</span>
                              <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                                {m.reps.length} reps
                              </span>
                            </button>
                            {m.reps.length > 0 && (
                              <ul className="mt-1 space-y-1 border-l border-border/40 pl-3">
                                {m.reps.map((r) => (
                                  <li key={r.user_id} className="flex items-center gap-1.5">
                                    <span className="truncate text-[12px] text-muted-foreground">{r.full_name}</span>
                                    {r.partner_name && (
                                      <span className="shrink-0 rounded border border-white/[0.08] bg-surface px-1 py-0.5 text-[10px] text-muted-foreground">
                                        {r.partner_name}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[12px] text-muted-foreground">No managers in this region yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {v.managers.length > 0 ? (
              <ul className="mt-2 space-y-1.5 border-l border-border/50 pl-3">
                {v.managers.map((m) => (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      onClick={() => goTo(m.user_id)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials(m.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-[13px] text-foreground">{m.full_name}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                        {m.mentee_count} mentees · {m.rep_count} reps
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              (v.regions || []).length === 0 && (
                <p className="mt-2 text-[12px] text-muted-foreground">No managers in this industry yet.</p>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default StackView;
