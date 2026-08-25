import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Flame, GraduationCap, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Scorecard {
  lessons_total: number;
  lessons_done: number;
  training_pct: number;
  weeks: { week_start: string; points: number }[];
  streak: number | null;
  leads: { claimed: number; contacted: number; signed: number };
  error?: string;
}

interface AttendanceSummary {
  expected: number;
  present: number;
  pct: number;
  missed_streak: number;
}

export function RepScorecard({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [data, setData] = useState<Scorecard | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [{ data: res }, { data: att }] = await Promise.all([
        (supabase as any).rpc('get_rep_scorecard', { _user_id: userId }),
        (supabase as any).rpc('get_attendance_summary', { p_user_id: userId }),
      ]);
      if (!alive) return;
      setData((res as Scorecard) || null);
      setAttendance((Array.isArray(att) ? att[0] : att) as AttendanceSummary || null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!data || data.error) return null;


  const weeks = data.weeks || [];
  const maxPoints = Math.max(1, ...weeks.map((w) => w.points));

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Scorecard</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
          <p className="micro-label flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3" /> Training
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">{data.training_pct}%</p>
          <p className="text-[11px] text-muted-foreground">
            {data.lessons_done} of {data.lessons_total} lessons
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
          <p className="micro-label flex items-center gap-1.5">
            <Flame className="w-3 h-3" /> Streak
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {data.streak != null ? data.streak : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.streak != null ? 'days in a row' : 'no streak data'}
          </p>
        </div>
      </div>

      {/* Weekly points, last 4 weeks */}
      <p className="micro-label mb-2">Points — last 4 weeks</p>
      <div className="flex items-end gap-2 mb-4 h-20">
        {weeks.map((w) => (
          <div key={w.week_start} className="flex-1 flex flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-bold tabular-nums text-foreground">{w.points}</span>
            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${Math.max(3, (w.points / maxPoints) * 100)}%` }}
            />
            <span className="text-[9px] text-muted-foreground tabular-nums">
              {w.week_start.slice(5).replace('-', '/')}
            </span>
          </div>
        ))}
        {weeks.length === 0 && <p className="text-xs text-muted-foreground">No points recorded yet.</p>}
      </div>

      {!compact && (
        <>
          <p className="micro-label mb-2 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Leads — all time
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Claimed', value: data.leads.claimed },
              { label: 'Contacted', value: data.leads.contacted },
              { label: 'Signed', value: data.leads.signed },
            ].map((s) => (
              <div key={s.label} className="p-2 rounded-lg bg-muted/30">
                <p className="text-base font-black text-foreground tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
