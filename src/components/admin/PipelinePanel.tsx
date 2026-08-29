import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnderConstruction } from '@/components/shared/UnderConstruction';

/**
 * A production or pay panel whose data source has never been loaded.
 * Shows one honest card instead of fake zeros, with the tools one tap away.
 */
export function PipelinePanel({
  table,
  recentDays,
  children,
}: {
  table: string;
  recentDays?: number;
  children: ReactNode;
}) {
  const [hasRows, setHasRows] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let q = (supabase as any).from(table).select('*', { count: 'exact', head: true });
      if (recentDays) {
        const since = new Date(Date.now() - recentDays * 86400000).toISOString();
        q = q.gte('created_at', since);
      }
      const { count, error } = await q;
      if (!alive) return;
      setHasRows(error ? true : (count ?? 0) > 0);
    })();
    return () => {
      alive = false;
    };
  }, [table, recentDays]);

  if (hasRows === null) return null;
  if (hasRows) return <>{children}</>;

  return (
    <div className="space-y-2">
      <UnderConstruction />
      <p className="text-center text-xs text-muted-foreground">Ready for the first import.</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 w-full rounded-xl border border-border/50 px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50"
      >
        {open ? 'Hide the tools' : 'Open the tools'}
      </button>
      {open && children}
    </div>
  );
}

export default PipelinePanel;
