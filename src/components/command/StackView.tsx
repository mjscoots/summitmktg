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
}

interface StackData {
  owner: Person | null;
  verticals: {
    vertical: string;
    label: string;
    lead: Person | null;
    total_reps: number;
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
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
              <p className="mt-2 text-[12px] text-muted-foreground">No managers in this industry yet.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default StackView;
