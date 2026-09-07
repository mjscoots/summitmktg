import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Intent {
  status: string | null;
  created_at: string | null;
}

/**
 * Re sign 2027. One card on the Pest and Fiber homes while the owner leaves the
 * app_settings key resign_2027_card on. The count is the same signed figure the
 * public cover reads, and the button uses the resign flow that already exists.
 */
export function Resign2027Card() {
  const { user } = useAuth();
  const [on, setOn] = useState(false);
  const [signed, setSigned] = useState<number | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [settingRes, counterRes, intentRes] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'resign_2027_card').maybeSingle(),
      (supabase as any).rpc('get_public_counters'),
      (supabase as any).rpc('my_resign_intent'),
    ]);
    const value = (settingRes.data as { value: string | null } | null)?.value;
    setOn(value === null || value === undefined ? true : value !== 'off');
    setSigned(Number((counterRes.data as { signed_2027?: number } | null)?.signed_2027 || 0));
    setIntent((intentRes.data as Intent) || { status: null, created_at: null });
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!on || signed === null || intent === null) return null;

  const when = intent.created_at
    ? new Date(intent.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  async function submit() {
    setSaving(true);
    const { error } = await (supabase as any).rpc('submit_resign_intent');
    setSaving(false);
    if (error) {
      toast.error('That did not send');
      return;
    }
    void load();
  }

  return (
    <section className="rounded-[var(--radius)] bg-card p-4" aria-label="Re sign 2027">
      <p className="text-[15px] font-semibold text-foreground">
        <span className="tabular-nums">{signed}</span> signed for 2027
      </p>

      {intent.status === 'confirmed' ? (
        <p className="mt-1 text-[13px] text-muted-foreground">
          {when ? `Signed for 2027 on ${when}` : 'Signed for 2027'}
        </p>
      ) : intent.status === 'pending' ? (
        <p className="mt-1 text-[13px] text-muted-foreground">
          {when ? `Asked to lock in on ${when}` : 'Asked to lock in'}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-muted-foreground">Lock in your spot</p>
          <Button className="mt-3 min-h-11 w-full" disabled={saving} onClick={submit}>
            I'm in for 2027
          </Button>
        </>
      )}
    </section>
  );
}

export default Resign2027Card;
