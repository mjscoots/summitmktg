import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

/**
 * Pass 99 — Your three. Asks every rep and manager for three people who could
 * do this job. Each row goes through submit_referral exactly as onboarding
 * does. Shown state derives from the database count, never a local flag.
 */
export function YourThreeCard() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc('my_referral_count');
    setCount(typeof data === 'number' ? data : 0);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Add a name and a ten digit phone number');
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('submit_referral', {
      _name: name.trim(),
      _phone: phone.trim(),
      _note: null,
    });
    setSaving(false);
    if (error) {
      toast.error('That did not send');
      return;
    }
    const res = data as { ok: boolean; error?: string; count?: number };
    if (!res?.ok) {
      toast.error(res?.error || 'That did not send');
      return;
    }
    const next = typeof res.count === 'number' ? res.count : (count || 0) + 1;
    setCount(next);
    setName('');
    setPhone('');
    toast.success('Sent to your manager');
    if (next === 3) void celebrate('setup');
  }

  if (count === null || !user) return null;

  const done = count >= 3;
  const left = Math.max(0, 3 - count);

  if (done && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 text-left text-[15px] text-muted-foreground"
      >
        <span>
          <span className="celebrate-text font-semibold">Your three are in</span> · add another
        </span>
      </button>
    );
  }

  return (
    <section className={done ? 'celebrate-card celebrate-in rounded-[var(--radius)] p-4' : 'rounded-[var(--radius)] border border-border bg-card p-4'}>
      <SectionEyebrow>Your three</SectionEyebrow>
      <p className="text-[15px] text-foreground">
        Who are three people who could do this job?
      </p>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Your manager follows up, you get credit.
      </p>

      <p className="mt-3 text-[15px] text-muted-foreground">
        {done ? 'Add another name' : `${left} ${left === 1 ? 'name' : 'names'} to go`}
      </p>

      <div className="mt-3 space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="min-h-11 text-[15px]"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          inputMode="tel"
          className="min-h-11 text-[15px]"
        />
        <Button className="min-h-11 w-full text-[15px]" onClick={submit} disabled={saving}>
          {saving ? 'Sending…' : 'Send this name'}
        </Button>
      </div>
    </section>
  );
}

export default YourThreeCard;
