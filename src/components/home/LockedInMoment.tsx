import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { celebrate } from '@/lib/celebrate';

/**
 * Pass 134 — the one time locked in moment. claim_resign_celebration returns
 * true exactly once per confirmation and logs it in celebration_log, so the
 * moment can never repeat. Reduced motion gets the static card only.
 */
export function LockedInMoment() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('claim_resign_celebration');
      if (!alive || data !== true) return;
      setOpen(true);
      void celebrate('graduation');
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Locked in for 2027"
      onClick={() => setOpen(false)}
      className="celebrate-wash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <p className="text-[11px] font-black tracking-[0.3em]" style={{ color: 'hsl(var(--celebrate-warm))' }}>
        2027
      </p>
      <p className="celebrate-text text-3xl font-black tracking-tight sm:text-4xl">
        You are locked in for 2027.
      </p>
      <button
        onClick={() => setOpen(false)}
        className="mt-6 min-h-11 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Tap to close
      </button>
    </div>
  );
}

export default LockedInMoment;
