import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeMinutes } from '@/hooks/useActivityTracking';

interface DailyTimeRow {
  date: string;
  total_minutes: number;
  training_minutes: number;
  video_minutes: number;
  lesson_minutes: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

interface DailyTimeBreakdownProps {
  userId: string;
}

export function DailyTimeBreakdown({ userId }: DailyTimeBreakdownProps) {
  const [rows, setRows] = useState<DailyTimeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { start, end } = getWeekRange();
      try {
        const { data, error } = await (supabase
          .from('daily_training_time' as any)
          .select('date, total_minutes, training_minutes, video_minutes, lesson_minutes')
          .eq('user_id', userId)
          .gte('date', start)
          .lte('date', end)
          .order('date') as any);

        if (!error && data) {
          setRows(data as DailyTimeRow[]);
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchData();
  }, [userId]);

  // Build a 7-day array (Mon-Sun), filling in zeros where no data
  const dailyData = useMemo(() => {
    const { start } = getWeekRange();
    const monday = new Date(start + 'T00:00:00');
    const result: (DailyTimeRow & { label: string })[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const match = rows.find(r => r.date === dateStr);
      result.push({
        label: DAY_LABELS[i],
        date: dateStr,
        total_minutes: match?.total_minutes ?? 0,
        training_minutes: match?.training_minutes ?? 0,
        video_minutes: match?.video_minutes ?? 0,
        lesson_minutes: match?.lesson_minutes ?? 0,
      });
    }
    return result;
  }, [rows]);

  const weekTotal = dailyData.reduce((s, d) => s + d.total_minutes, 0);
  const maxMinutes = Math.max(...dailyData.map(d => d.total_minutes), 1);
  const activeDays = dailyData.filter(d => d.total_minutes > 0);
  const activeDayCount = activeDays.length;

  const mostActiveDay = useMemo(() => {
    if (activeDays.length === 0) return null;
    return activeDays.reduce((best, d) =>
      d.total_minutes > best.total_minutes ? d : best
    );
  }, [activeDays]);

  const avgPerActiveDay = activeDayCount > 0
    ? Math.round(weekTotal / activeDayCount)
    : 0;

  if (isLoading) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">Daily Training Time</p>
        <span className="ml-auto text-xs font-medium text-foreground">
          {formatTimeMinutes(weekTotal)} this week
        </span>
      </div>

      {/* Bar chart */}
      <div className="space-y-1.5">
        {dailyData.map(day => {
          const pct = maxMinutes > 0 ? (day.total_minutes / maxMinutes) * 100 : 0;
          const isToday = day.date === today;
          return (
            <div key={day.date} className="flex items-center gap-2">
              <span className={cn(
                "text-[11px] w-7 text-right font-medium",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {day.label}
              </span>
              <div className="flex-1 h-5 bg-muted/50 rounded-sm overflow-hidden relative">
                {day.total_minutes > 0 && (
                  <div
                    className={cn(
                      "h-full rounded-sm transition-all",
                      isToday ? "bg-primary" : "bg-primary/60"
                    )}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[11px] w-10 text-right font-medium",
                day.total_minutes === 0 ? "text-muted-foreground/50" : "text-foreground"
              )}>
                {day.total_minutes > 0 ? formatTimeMinutes(day.total_minutes) : '--'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Manager insights */}
      {weekTotal > 0 && (
        <div className="pt-2 border-t border-border/30 space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">Insights</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Trained <span className="text-foreground font-medium">{activeDayCount} of 7</span> days this week
          </p>
          {mostActiveDay && (
            <p className="text-[11px] text-muted-foreground">
              Most active day: <span className="text-foreground font-medium">{mostActiveDay.label}</span> ({formatTimeMinutes(mostActiveDay.total_minutes)})
            </p>
          )}
          {activeDayCount > 1 && (
            <p className="text-[11px] text-muted-foreground">
              Average per active day: <span className="text-foreground font-medium">{formatTimeMinutes(avgPerActiveDay)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
