import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pest sent-rep override, as stated by the owner. Draft until confirmed —
 * text only, no payout math.
 */
export function SentRepOverrideNote() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pest_sent_rep_override')
        .maybeSingle();
      if (!active) return;
      const value = (data?.value ?? '').trim();
      setText(value === '' ? null : value);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!text) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-background/40 p-4">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Reps Summit sends you
        </p>
        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
          Draft
        </span>
      </div>
      <p className="mt-1.5 text-sm text-foreground">{text}</p>
    </div>
  );
}

export default SentRepOverrideNote;
