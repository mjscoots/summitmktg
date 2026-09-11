import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecruitGate } from '@/hooks/useRecruitGate';
import { Button } from '@/components/ui/button';

/**
 * The first ten minutes. A brand new account sees this once: three steps, one
 * button each. first_open_at is stamped by mark_first_open on the first render,
 * so the screen never comes back.
 */
export function WelcomeFirstOpen() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const gate = useRecruitGate();
  const [show, setShow] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const stamped = useRef(false);

  const check = useCallback(async () => {
    if (!user?.id || stamped.current) return;
    const { data } = await (supabase as any)
      .from('profiles')
      .select('first_open_at, manager_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const row = (data as { first_open_at: string | null; manager_id: string | null } | null) || null;
    setManagerId(row?.manager_id || null);
    if (row && row.first_open_at === null) {
      stamped.current = true;
      await (supabase as any).rpc('mark_first_open');
      setShow(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void check();
  }, [check]);

  if (!show) return null;

  const firstName = profile?.full_name?.split(' ')[0] || null;

  const steps: { title: string; button: string; to: string }[] = [
    {
      title: 'Watch day one',
      button: 'Open day one',
      to: gate.locked ? '/recruit-course' : '/app/training',
    },
    {
      title: 'Meet your Pillar',
      button: 'Open the message',
      to: managerId ? `/app/chat?person=${managerId}` : '/app/chat',
    },
    {
      title: 'Say hi',
      button: 'Open general',
      to: '/app/chat?room=general&compose=1',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-5 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">
          {firstName ? `Welcome to Trinity, ${firstName}.` : 'Welcome to Trinity.'}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Three things before your first door.</p>

        <ol className="welcome-steps mt-8 space-y-6">
          {steps.map((step, i) => (
            <li key={step.title}>
              <p className="text-[15px] font-semibold text-foreground">
                {i + 1}. {step.title}
              </p>
              {/* One lime action on the screen; the other two steps are outlined. */}
              <Button
                variant={i === 0 ? 'default' : 'outline'}
                className={i === 0 ? 'welcome-primary mt-3 min-h-11 w-full' : 'mt-3 min-h-11 w-full'}
                onClick={() => { setShow(false); navigate(step.to); }}
              >
                {step.button}
              </Button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setShow(false)}
          className="mt-8 inline-flex min-h-11 items-center text-[13px] text-muted-foreground underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default WelcomeFirstOpen;
