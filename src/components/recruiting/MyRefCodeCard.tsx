import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CopyLinkButton } from '@/components/shared/CopyLinkButton';

/**
 * Every approved, active rep has a personal ref code. Anyone who submits the
 * ticket form through this link is attributed to them.
 */
export function MyRefCodeCard() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_my_ref_code');
      if (alive) setCode((data as string) || null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!code) return null;

  const path = `/ticket?ref=${encodeURIComponent(code)}`;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Ticket className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">My ticket link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone who fills out the ticket form from this link is credited to you.
          </p>

          <div className="mt-4 rounded-xl border border-border/60 bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your code
            </p>
            <p className="mt-0.5 break-all font-mono text-sm font-bold text-foreground">{code}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {window.location.origin}
              {path}
            </p>
          </div>

          <div className="mt-3">
            <CopyLinkButton path={path} label="Copy my ticket link" />
          </div>
        </div>
      </div>
    </div>
  );
}
