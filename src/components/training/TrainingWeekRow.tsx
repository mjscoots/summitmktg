import { useTrainingWeek } from '@/hooks/useTrainingWeek';

/**
 * Pass 101 - one quiet row: minutes this week, days trained out of days
 * elapsed, and the current streak. Real numbers only.
 */
export function TrainingWeekRow() {
  const { minutes, daysTrained, daysElapsed, streak, isLoading } = useTrainingWeek();
  if (isLoading) return null;

  return (
    <p className="mb-4 text-[13px] text-muted-foreground">
      <span className="tabular-nums text-foreground">{minutes}</span> training minutes this week ·{' '}
      <span className="tabular-nums text-foreground">
        {daysTrained}/{daysElapsed}
      </span>{' '}
      {daysElapsed === 1 ? 'day' : 'days'} trained ·{' '}
      <span className="tabular-nums text-foreground">{streak}</span> day streak
    </p>
  );
}

export default TrainingWeekRow;
