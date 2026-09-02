import { ReactNode, useEffect, useState } from 'react';

/** Pass 157 - local yyyy-MM-dd without pulling the date library into the shell. */
function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GuidedSetup } from '@/components/onboarding/GuidedSetup';

interface ProfileCompletionGateProps {
  children: ReactNode;
}

const SETUP_FIELDS =
  'full_name, nickname, phone, avatar_url, hometown, organization, shirt_size, emergency_contact_name, emergency_contact_phone, referred_by, onboarding_status, years_in_industry, years_self_set_at';


/**
 * Day one setup. New people walk the guided flow one question per screen; anyone
 * who has already given the basics goes straight through. Skipping is allowed,
 * and the flow comes back the next day until it is finished.
 */
export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [initial, setInitial] = useState<Record<string, any> | null>(null);
  const [checking, setChecking] = useState(true);
  const [complete, setComplete] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;

    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select(SETUP_FIELDS)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;

      const row = (data as Record<string, any>) || {};
      setInitial(row);
      const basics = !!(row.full_name?.trim() && row.phone?.trim() && row.avatar_url);
      setComplete(basics);
      setChecking(false);
    })();

    const today = todayKey();
    if (localStorage.getItem(`profile_gate_skipped_${user.id}_${today}`) === 'true') {
      setSkipped(true);
    }

    return () => {
      alive = false;
    };
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (complete || skipped || !initial) return <>{children}</>;

  return (
    <GuidedSetup
      initial={initial}
      onDone={() => setComplete(true)}
      onSkipAll={() => {
        if (user) {
          const today = todayKey();
          localStorage.setItem(`profile_gate_skipped_${user.id}_${today}`, 'true');
        }
        setSkipped(true);
      }}
    />
  );
}

export default ProfileCompletionGate;
