import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Mail, BarChart3, GraduationCap as CapIcon, Flame } from 'lucide-react';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-5';

interface Scorecard {
  lessons_total: number;
  lessons_done: number;
  training_pct: number;
  streak: number | null;
  leads: { claimed: number; contacted: number; signed: number };
  error?: string;
}

export default function AlumniPage() {
  const { user, profile } = useAuth();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc('get_rep_scorecard' as never, { _user_id: user.id } as never);
      if (!alive) return;
      setScorecard((data as unknown as Scorecard) || null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Only alumni accounts see this screen; everyone else goes home.
  if (profile && (profile as { alumni?: boolean | null }).alumni !== true) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {profile?.full_name ? `Alumni — ${profile.full_name}` : 'Alumni'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account is set to alumni status. Here's a summary of your time with the team.
          </p>
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Your History</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : scorecard && !scorecard.error ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <CapIcon className="w-3 h-3" /> Training
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">{scorecard.training_pct}%</p>
                <p className="text-[11px] text-muted-foreground">
                  {scorecard.lessons_done} of {scorecard.lessons_total} lessons
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Best Streak
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {scorecard.streak != null ? `${scorecard.streak}d` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30 col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Leads / Signs</p>
                <p className="text-sm text-foreground mt-1">
                  {scorecard.leads?.claimed ?? 0} claimed · {scorecard.leads?.contacted ?? 0} contacted ·{' '}
                  {scorecard.leads?.signed ?? 0} signed
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No history available.</p>
          )}
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Contact Us</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Questions about your account or records? Reach out and we'll help.
          </p>
          <a
            href="mailto:support@summitmktgsales.com"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            support@summitmktgsales.com
          </a>
        </div>
      </div>
    </div>
  );
}
