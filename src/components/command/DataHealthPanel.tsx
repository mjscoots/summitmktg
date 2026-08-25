import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Person = { user_id: string; name: string | null; missing?: string };
type Dup = { name: string | null; count: number };
type Mismatch = {
  user_id: string;
  name: string | null;
  profile_vertical: string | null;
  enrollment_vertical: string | null;
};

interface Health {
  no_rank: Person[];
  no_manager: Person[];
  no_vertical: Person[];
  duplicate_names: Dup[];
  vertical_mismatch: Mismatch[];
  picker_gaps: Person[];
  error?: string;
}

const EMPTY: Health = {
  no_rank: [],
  no_manager: [],
  no_vertical: [],
  duplicate_names: [],
  vertical_mismatch: [],
  picker_gaps: [],
};

function PersonRow({ p, detail }: { p: Person; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] py-2 first:border-t-0">
      <Link
        to={`/app/roster?person=${p.user_id}`}
        className="truncate text-sm text-foreground underline decoration-white/20 underline-offset-2 hover:decoration-white/60"
      >
        {p.name || 'Unnamed'}
      </Link>
      {detail ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{detail}</span>
      ) : null}
    </div>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{count}</p>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {count === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nothing to fix.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function DataHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('get_data_health');
    setHealth({ ...EMPTY, ...((data as Partial<Health>) || {}) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fixRanks = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('recompute_missing_ranks');
    setBusy(false);
    if (error || (data && data.success === false)) {
      toast.error(error?.message || data?.error || 'Could not update ranks');
      return;
    }
    toast.success(`Ranks set for ${data?.fixed ?? 0} people`);
    load();
  };

  if (!health) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading data health
      </div>
    );
  }

  if (health.error) {
    return <p className="py-6 text-sm text-muted-foreground">{health.error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={fixRanks}
          disabled={busy || health.no_rank.length === 0}
          className="min-h-[44px] rounded-lg border border-white/[0.08] bg-card px-4 text-sm font-medium text-foreground disabled:opacity-50"
        >
          {busy ? 'Working' : `Set missing ranks (${health.no_rank.length})`}
        </button>
        <button
          type="button"
          onClick={load}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/[0.08] px-4 text-sm text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Group title="No rank" count={health.no_rank.length}>
          {health.no_rank.map((p) => (
            <PersonRow key={p.user_id} p={p} />
          ))}
        </Group>
        <Group title="No manager" count={health.no_manager.length}>
          {health.no_manager.map((p) => (
            <PersonRow key={p.user_id} p={p} />
          ))}
        </Group>
        <Group title="No industry" count={health.no_vertical.length}>
          {health.no_vertical.map((p) => (
            <PersonRow key={p.user_id} p={p} />
          ))}
        </Group>
        <Group title="Duplicate names" count={health.duplicate_names.length}>
          {health.duplicate_names.map((d) => (
            <div
              key={d.name ?? 'unnamed'}
              className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-t-0"
            >
              <span className="truncate text-sm text-foreground">{d.name || 'Unnamed'}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{d.count} records</span>
            </div>
          ))}
        </Group>
        <Group title="Industry mismatch" count={health.vertical_mismatch.length}>
          {health.vertical_mismatch.map((m) => (
            <PersonRow
              key={m.user_id}
              p={{ user_id: m.user_id, name: m.name }}
              detail={`${m.profile_vertical} / ${m.enrollment_vertical}`}
            />
          ))}
        </Group>
        <Group title="Picker gaps" count={health.picker_gaps.length}>
          {health.picker_gaps.map((p) => (
            <PersonRow key={p.user_id} p={p} detail={p.missing} />
          ))}
        </Group>
      </div>
    </div>
  );
}
