import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface MenteeRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  vertical: string;
  label: string;
  status: string;
  steps_total: number;
  steps_done: number;
  current_step_title: string | null;
  days_since_progress: number;
  nudged_recently: boolean;
}

/** Managers: reps paired to them per industry, with progress and a rate-limited nudge. */
export function MyMenteesPanel() {
  const [rows, setRows] = useState<MenteeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_mentees' as never);
    setRows(((data as unknown as { rows: MenteeRow[] })?.rows) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nudge = async (row: MenteeRow) => {
    setBusy(row.user_id + row.vertical);
    const { data, error } = await supabase.rpc('nudge_mentee' as never, {
      _user_id: row.user_id,
      _vertical: row.vertical,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Not sent', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Nudge sent' });
    load();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading mentees...</p>;
  }

  if (rows.length === 0) {
    return (
      <div className={`${CARD} p-5`}>
        <p className="text-sm text-muted-foreground">No reps are paired with you yet.</p>
      </div>
    );
  }

  const byLabel = rows.reduce<Record<string, MenteeRow[]>>((acc, r) => {
    (acc[r.label] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byLabel).map(([label, list]) => (
        <div key={label} className={`${CARD} p-4 sm:p-5`}>
          <p className="micro-label mb-3">{label}</p>
          <ul className="space-y-2">
            {list.map((r) => (
              <li
                key={r.user_id + r.vertical}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-surface px-3 py-2.5"
              >
                <UserAvatar fullName={r.full_name || 'Rep'} avatarUrl={r.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{r.full_name || 'Rep'}</p>
                  <p className="text-[12px] tabular-nums text-muted-foreground">
                    {r.status === 'active'
                      ? 'Setup complete'
                      : `Step ${Math.min(r.steps_done + 1, r.steps_total || 1)} of ${r.steps_total}${
                          r.current_step_title ? `: ${r.current_step_title}` : ''
                        }`}
                    {' · '}
                    {r.days_since_progress === 0 ? 'progress today' : `${r.days_since_progress}d since progress`}
                  </p>
                </div>
                {r.status !== 'active' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-9"
                    disabled={r.nudged_recently || busy === r.user_id + r.vertical}
                    onClick={() => nudge(r)}
                  >
                    <Bell className="mr-1.5 h-3.5 w-3.5" />
                    {r.nudged_recently ? 'Nudged' : 'Nudge'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default MyMenteesPanel;
