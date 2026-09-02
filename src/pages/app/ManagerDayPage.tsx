import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useManagerDay } from '@/hooks/useManagerDay';

interface Line {
  key: string;
  count: number;
  text: string;
  to: string | null;
}

/** One line: a sentence with a count, or muted text when there is nothing. */
function DayLine({ line, first }: { line: Line; first: boolean }) {
  const navigate = useNavigate();
  const border = first ? '' : ' border-t border-white/[0.06]';

  if (line.count === 0 || !line.to) {
    return (
      <div className={'flex min-h-[52px] items-center px-4 py-3' + border}>
        <p className="text-[14px] text-muted-foreground">Nothing today</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(line.to as string)}
      className={
        'flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary' +
        border
      }
    >
      <span className="flex-1 text-[14px] text-foreground">{line.text}</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * Pass 156 - Today. Five lines, each a tap into the screen that already does
 * the work. Manager, Pillar and Owner only, scoped by the database.
 */
export default function ManagerDayPage() {
  const { day, loading, isManager } = useManagerDay();

  const stuckPath = () => {
    try {
      sessionStorage.setItem('day-stuck-ids', JSON.stringify(day.stuck_ids || []));
    } catch {
      // A blocked storage just means the tracker opens unfiltered.
    }
    return '/app/team?onboarding=stuck';
  };

  const names = (day.blitz_names || []).filter(Boolean);
  const namesLine =
    names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;

  const lines: Line[] = [
    {
      key: 'radar',
      count: day.radar_count || 0,
      text: `Call today: ${day.radar_count || 0} ${day.radar_count === 1 ? 'person' : 'people'} on your radar`,
      to: '/app/team',
    },
    {
      key: 'owed',
      count: day.owed_count || 0,
      text: `One on ones owed this week: ${day.owed_count || 0}`,
      to: '/app/one-on-ones/prep',
    },
    {
      key: 'stuck',
      count: day.stuck_count || 0,
      text: `Stuck on onboarding: ${day.stuck_count || 0} ${day.stuck_count === 1 ? 'rep' : 'reps'} on a step for 7 days or more`,
      to: stuckPath(),
    },
    {
      key: 'blitz',
      count: day.blitz_open_count || 0,
      text: `Blitz RSVPs still open: ${day.blitz_open_count || 0} ${
        day.blitz_open_count === 1 ? 'person has' : 'people have'
      } not answered the next blitz${namesLine ? `: ${namesLine}` : ''}`,
      to: day.blitz_event_id ? `/app/events#event-${day.blitz_event_id}` : null,
    },
    {
      key: 'awaiting',
      count: day.awaiting_count || 0,
      text: `Waiting to be placed: ${day.awaiting_count || 0}`,
      to: '/admin/requests',
    },
  ];

  return (
    <AppLayout>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Today" />

        {loading ? (
          <Loader2 className="mt-6 h-4 w-4 animate-spin text-muted-foreground" />
        ) : !isManager ? (
          <p className="mt-6 text-[14px] text-muted-foreground">
            This screen is for managers and above.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60">
            {lines.map((line, i) => (
              <DayLine key={line.key} line={line} first={i === 0} />
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
