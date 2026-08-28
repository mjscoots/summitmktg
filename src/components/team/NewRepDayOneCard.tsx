import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalInterviewDialog } from '@/components/onboarding/GoalInterviewDialog';

interface Row {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  hometown: string | null;
  organization: string | null;
  shirt_size: string | null;
  emergency_contact_name: string | null;
  created_at: string;
}

/** What day one still owes us for this person, plus the interview action. */
export function NewRepDayOneCard({ userId }: { userId: string }) {
  const [row, setRow] = useState<Row | null>(null);
  const [interviewed, setInterviewed] = useState<boolean | null>(null);
  const [referrals, setReferrals] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [p, ci, rl] = await Promise.all([
      (supabase as any)
        .from('profiles')
        .select(
          'full_name, avatar_url, phone, hometown, organization, shirt_size, emergency_contact_name, created_at'
        )
        .eq('user_id', userId)
        .maybeSingle(),
      (supabase as any)
        .from('commitment_interviews')
        .select('id')
        .eq('rep_id', userId)
        .eq('season', '2027')
        .maybeSingle(),
      (supabase as any)
        .from('recruiting_leads')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_user_id', userId),
    ]);
    setRow((p.data as Row) || null);
    setInterviewed(!!ci.data);
    setReferrals(rl.count || 0);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!row || interviewed === null) return null;

  const missing: string[] = [];
  if (!row.avatar_url) missing.push('Photo');
  if (!row.phone?.trim()) missing.push('Phone');
  if (!row.hometown?.trim()) missing.push('Hometown');
  if (!row.organization?.trim()) missing.push('School or job');
  if (!row.shirt_size) missing.push('Shirt size');
  if (!row.emergency_contact_name?.trim()) missing.push('Emergency contact');
  if (!interviewed) missing.push('Goal interview');
  if (referrals === 0) missing.push('Referrals');

  const newish = Date.now() - new Date(row.created_at).getTime() < 45 * 24 * 60 * 60 * 1000;
  if (!missing.length || !newish) return null;

  return (
    <Card className="p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        New rep
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">Day one still needs:</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {missing.map((m) => (
          <span
            key={m}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {m}
          </span>
        ))}
      </div>
      {!interviewed && (
        <Button className="mt-3 min-h-11 w-full" onClick={() => setOpen(true)}>
          Complete interview
        </Button>
      )}
      <GoalInterviewDialog
        open={open}
        onOpenChange={setOpen}
        repId={userId}
        repName={row.full_name}
        onSaved={() => void load()}
      />
    </Card>
  );
}

export default NewRepDayOneCard;
