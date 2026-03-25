import { PrepRep } from '@/hooks/useOneOnOnePrep';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Flame, AlertTriangle, Check, Trophy, Clock } from 'lucide-react';

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DailyChart({ daily, label }: { daily: number[]; label: string }) {
  const max = Math.max(...daily, 1);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-end gap-1 h-8">
        {daily.map((mins, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className={cn(
                'w-full rounded-sm transition-all',
                mins > 0 ? 'bg-primary' : 'bg-muted'
              )}
              style={{ height: `${Math.max((mins / max) * 28, 2)}px` }}
            />
            <span className="text-[9px] text-muted-foreground mt-0.5">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-0.5">
        {daily.map((mins, i) => (
          <span key={i} className="text-[8px] text-muted-foreground text-center flex-1">
            {mins > 0 ? formatMinutes(mins) : '–'}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (previous === 0) return <TrendingUp className="w-3 h-3 text-primary" />;
  const pctChange = ((current - previous) / previous) * 100;
  if (pctChange > 5) return <TrendingUp className="w-3 h-3 text-primary" />;
  if (pctChange < -5) return <TrendingDown className="w-3 h-3 text-destructive" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function changeLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) return '—';
  if (previous === 0) return '+∞';
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

export function TrainingDataPanel({
  rep,
  lastMonday,
  lastSunday,
}: {
  rep: PrepRep;
  lastMonday: Date;
  lastSunday: Date;
}) {
  const weekBeforeMonday = new Date(lastMonday);
  weekBeforeMonday.setDate(weekBeforeMonday.getDate() - 7);
  const weekBeforeSunday = new Date(lastSunday);
  weekBeforeSunday.setDate(weekBeforeSunday.getDate() - 7);

  const lastWeekAvg = Math.round(rep.lastWeekMinutes / 7);
  const weekBeforeAvg = Math.round(rep.weekBeforeMinutes / 7);

  // Auto-insights
  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];
  if (rep.lastWeekMinutes > rep.weekBeforeMinutes && rep.weekBeforeMinutes > 0) {
    insights.push({ icon: <Flame className="w-3 h-3" />, text: 'Hours up week-over-week', color: 'text-primary' });
  }
  if (rep.lastWeekMinutes < rep.weekBeforeMinutes && rep.weekBeforeMinutes > 0) {
    insights.push({ icon: <AlertTriangle className="w-3 h-3" />, text: 'Hours down week-over-week', color: 'text-destructive' });
  }
  if (rep.lastWeekCompletedLessons.length > 0) {
    insights.push({ icon: <Check className="w-3 h-3" />, text: `${rep.lastWeekCompletedLessons.length} modules completed`, color: 'text-primary' });
  } else {
    insights.push({ icon: <AlertTriangle className="w-3 h-3" />, text: 'No modules completed last week', color: 'text-primary' });
  }
  if (rep.peerRank === 1) {
    insights.push({ icon: <Trophy className="w-3 h-3" />, text: '#1 team performer', color: 'text-primary' });
  }
  if (rep.lastWeekMinutes > 480 && rep.lastWeekCompletedLessons.length === 0) {
    insights.push({ icon: <Clock className="w-3 h-3" />, text: 'High time, low gain', color: 'text-primary' });
  }

  const teamAvgPct = rep.teamAvgMinutes > 0
    ? Math.round((rep.lastWeekMinutes / rep.teamAvgMinutes) * 100)
    : 0;

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {rep.avatar_url ? (
          <img src={rep.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {rep.full_name.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-foreground">{rep.full_name}</h2>
          <p className="text-xs text-muted-foreground">
            Training: {rep.trainingProgress}% ({rep.completedItems}/{rep.totalItems})
          </p>
        </div>
      </div>

      {/* Last Week */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Last Week ({format(lastMonday, 'MMM d')}–{format(lastSunday, 'MMM d')})
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-lg font-bold text-foreground">{formatMinutes(rep.lastWeekMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">{lastWeekAvg}min/day</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{rep.lastWeekDaysActive}/7</p>
            <p className="text-[10px] text-muted-foreground">Days active</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">#{rep.peerRank}</p>
            <p className="text-[10px] text-muted-foreground">of {rep.peerTotal}</p>
          </div>
        </div>

        <DailyChart daily={rep.lastWeekDailyMinutes} label="DAILY BREAKDOWN" />
      </div>

      {/* Completed Last Week */}
      {rep.lastWeekCompletedLessons.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground">Completed Last Week</h4>
          {rep.lastWeekCompletedLessons.map(l => (
            <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="truncate">{l.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Week Before */}
      <div className="bg-muted/20 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Week Before ({format(weekBeforeMonday, 'MMM d')}–{format(weekBeforeSunday, 'MMM d')})
        </h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="font-semibold text-foreground">{formatMinutes(rep.weekBeforeMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">{weekBeforeAvg}min/day</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{rep.weekBeforeDaysActive}/7</p>
            <p className="text-[10px] text-muted-foreground">Days active</p>
          </div>
          <div />
        </div>
      </div>

      {/* 2-Week Comparison */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">2-Week Comparison</h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hours</span>
            <span className="flex items-center gap-1 text-foreground">
              {formatMinutes(rep.weekBeforeMinutes)} → {formatMinutes(rep.lastWeekMinutes)}
              <TrendArrow current={rep.lastWeekMinutes} previous={rep.weekBeforeMinutes} />
              <span className="text-[10px]">{changeLabel(rep.lastWeekMinutes, rep.weekBeforeMinutes)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Days</span>
            <span className="flex items-center gap-1 text-foreground">
              {rep.weekBeforeDaysActive}/7 → {rep.lastWeekDaysActive}/7
              <TrendArrow current={rep.lastWeekDaysActive} previous={rep.weekBeforeDaysActive} />
            </span>
          </div>
        </div>
      </div>

      {/* Peer Comparison */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-foreground">Peer Comparison</h4>
        <p className="text-xs text-muted-foreground">
          Rank: <span className="text-foreground font-medium">#{rep.peerRank}</span> of {rep.peerTotal}
          {rep.team_name && <span> on {rep.team_name}</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          vs Team Avg: <span className="text-foreground font-medium">{teamAvgPct}%</span> ({formatMinutes(Math.round(rep.teamAvgMinutes))} avg)
        </p>
      </div>

      {/* Auto-Insights */}
      {insights.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground">Auto-Insights</h4>
          {insights.map((ins, i) => (
            <div key={i} className={cn('flex items-center gap-2 text-xs', ins.color)}>
              {ins.icon}
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
