import { useNavigate } from 'react-router-dom';
import { Calendar, Target, GraduationCap, TrendingUp, AlertTriangle, Activity, Moon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeSnapshot } from '@/hooks/useHomeSnapshot';
import { useAdminCounts } from '@/hooks/useAdminCounts';


function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface CardProps {
  label: string;
  value: string;
  detail: string;
  icon: typeof Calendar;
  onClick: () => void;
  warning?: boolean;
}

function ActionCard({ label, value, detail, icon: Icon, onClick, warning }: CardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'stat-card group min-h-[92px] w-full text-left transition-all duration-180 hover:-translate-y-0.5',
        warning && '!border-warning/30 !bg-warning/[0.06]'
      )}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', warning ? 'text-warning' : 'text-primary')} />
        <span className="micro-label truncate">{label}</span>
      </div>
      <p className={cn('stat-value relative z-10 mt-1.5 truncate tabular-nums', warning && '!text-warning')}>
        {value}
      </p>
      <p className="relative z-10 mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
    </button>
  );
}

export function HomeActionRow() {
  const navigate = useNavigate();
  const { data, isLoading } = useHomeSnapshot();
  // Same source of truth as the sidebar Admin badge
  const adminCounts = useAdminCounts();


  if (isLoading && !data) {
    return (
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const atRisk = data.lead_at_risk;
  const nextLesson = data.next_lesson;

  return (
    <div className="mb-5 space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ActionCard
          label="Today"
          value={`${data.events_today}`}
          detail={
            data.next_event
              ? `Next ${formatTime(data.next_event.event_date)} · ${data.next_event.title}`
              : data.events_today > 0
                ? 'All events done'
                : 'No events today'
          }
          icon={Calendar}
          onClick={() => navigate('/app/calendar')}
        />

        {atRisk ? (
          <ActionCard
            label="Lead at risk"
            value={`${atRisk.hours_left}h`}
            detail={`${atRisk.first_name} releases soon`}
            icon={AlertTriangle}
            warning
            onClick={() => navigate('/app/recruits')}
          />
        ) : (
          <ActionCard
            label="Leads"
            value={`${data.unclaimed_leads}`}
            detail={data.unclaimed_leads > 0 ? 'Unclaimed on the board' : 'Board is clear'}
            icon={Target}
            onClick={() => navigate('/app/recruits')}
          />
        )}

        <ActionCard
          label="Training"
          value={nextLesson ? 'Resume' : 'Done'}
          detail={nextLesson ? nextLesson.title : 'All lessons complete'}
          icon={GraduationCap}
          onClick={() =>
            navigate(
              nextLesson
                ? `/app/training/${nextLesson.course_slug}/${nextLesson.lesson_id}`
                : '/app/training'
            )
          }
        />

        <ActionCard
          label="This week"
          value={data.is_staff ? `${data.team_signs}` : `${data.week_points}`}
          detail={data.is_staff ? 'Team signs this week' : 'Points this week'}
          icon={TrendingUp}
          onClick={() => navigate('/app/leaderboard')}
        />
      </div>

      {data.is_staff && (
        <div className="flex flex-wrap items-stretch gap-2.5 rounded-[var(--radius)] border border-white/[0.06] bg-card/60 p-2 backdrop-blur-sm">
          <button
            onClick={() => navigate('/app/team')}
            className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <Activity className="h-3.5 w-3.5 shrink-0 text-success" />
            <span className="micro-label truncate">Active today</span>
            <span className="ml-auto text-[13px] font-bold tabular-nums text-foreground">{data.team_active_today}</span>
          </button>

          <button
            onClick={() => navigate('/app/war-room')}
            className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <Moon className="h-3.5 w-3.5 shrink-0 text-warning" />
            <span className="micro-label truncate">Quiet 48h</span>
            <span className="ml-auto text-[13px] font-bold tabular-nums text-foreground">{data.team_stale_48h}</span>
          </button>

          {data.is_admin && (
            <button
              onClick={() => navigate('/admin/team')}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-3 transition-colors hover:bg-foreground/[0.04]"
            >
              <Inbox className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="micro-label truncate">Queue</span>
              <span className="ml-auto text-[13px] font-bold tabular-nums text-foreground">{adminCounts.total}</span>

            </button>
          )}
        </div>
      )}
    </div>
  );
}
