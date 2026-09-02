import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

interface Props {
  /** True only when the roster row exists and signed_2027 is false. */
  eligible: boolean;
}

/**
 * Pass 134 - the re-sign intent card. A producer who is not signed for 2027
 * raises a hand in one tap; the owner confirms it from the Decisions lane.
 * State comes from my_resign_intent, never a local flag.
 */
export function ResignIntentCard({ eligible }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc('my_resign_intent');
    setStatus(((data as { status?: string | null } | null)?.status ?? null) as string | null);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!eligible || status === undefined) return null;
  if (status === 'confirmed') return null;

  const raised = status === 'pending';

  async function submit() {
    setSaving(true);
    const { error } = await (supabase as any).rpc('submit_resign_intent');
    setSaving(false);
    if (error) {
      toast.error('That did not send');
      return;
    }
    setStatus('pending');
  }

  return (
    <section>
      <SectionEyebrow>Next season</SectionEyebrow>
      <div className="card-ice p-4">
        {raised ? (
          <p className="text-[15px] font-semibold text-foreground">Got it. Mathew has been pinged.</p>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-foreground">Lock in 2027</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Tell Mathew you are coming back next season.
            </p>
            <Button className="mt-3 min-h-11 w-full" disabled={saving} onClick={submit}>
              I'm in for 2027
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export default ResignIntentCard;
