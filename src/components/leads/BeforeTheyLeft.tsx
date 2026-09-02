import { Link } from 'react-router-dom';
import type { LeadSnapshot } from '@/hooks/useLeads';
import { departureLabel } from '@/components/admin/DepartureIntakeDialog';

interface Props {
  snapshot: LeadSnapshot | null | undefined;
  aiSummary?: string | null;
  /** Set for staff so they can open the person's old profile. */
  profileUserId?: string | null;
}

function List({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="micro-label">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((s, i) => (
          <li key={`${label}-${i}`} className="text-[13px] leading-snug text-foreground">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="micro-label">{label}</p>
      <p className="text-[13px] text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function num(n: number | null | undefined): string {
  return n === null || n === undefined ? '-' : String(n);
}

function answerLines(answers: Record<string, unknown> | null | undefined): string[] {
  if (!answers || typeof answers !== 'object') return [];
  return Object.entries(answers)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`);
}

export default function BeforeTheyLeft({ snapshot, aiSummary, profileUserId }: Props) {
  if (!snapshot) return null;

  const ai = snapshot.ai_profile || null;
  const eng = snapshot.engagement || null;
  const dep = snapshot.departure || null;
  const answers = (snapshot.event_answers || []).filter((a) => answerLines(a.answers).length > 0);
  const summary = ai?.summary || aiSummary || null;

  const hasAnything =
    !!summary ||
    (ai?.strengths?.length ?? 0) > 0 ||
    (ai?.concerns?.length ?? 0) > 0 ||
    (ai?.goals?.length ?? 0) > 0 ||
    !!eng ||
    answers.length > 0 ||
    !!(dep?.departure_type || dep?.departure_reason || dep?.last_day_worked);

  if (!hasAnything) return null;

  return (
    <div className="mt-5 rounded-[var(--radius)] border border-border/60 bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="micro-label">Before they left</p>
        {profileUserId && (
          <Link to={`/app/person/${profileUserId}`} className="text-[12px] font-semibold text-primary">
            Open their old profile
          </Link>
        )}
      </div>

      {(dep?.departure_type || dep?.departure_reason || dep?.last_day_worked) && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Stat label="Departure" value={departureLabel(dep?.departure_type) || '-'} />
          <Stat
            label="Last day"
            value={dep?.last_day_worked ? new Date(dep.last_day_worked).toLocaleDateString() : '-'}
          />
          {dep?.departure_reason && (
            <div className="col-span-2 min-w-0">
              <p className="micro-label">Reason</p>
              <p className="text-[13px] leading-snug text-foreground">{dep.departure_reason}</p>
            </div>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-3">
          <p className="micro-label">What Summit had learned</p>
          <p className="mt-1 text-[13px] leading-snug text-foreground">{summary}</p>
        </div>
      )}
      <List label="Strengths" items={ai?.strengths} />
      <List label="Concerns" items={ai?.concerns} />
      <List label="Goals" items={ai?.goals} />

      {eng && (
        <div className="mt-3">
          <p className="micro-label mb-1">Last 30 days</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="In the app" value={`${num(eng.app_minutes_30d)} min`} />
            <Stat label="Training" value={`${num(eng.training_minutes_30d)} min`} />
            <Stat label="Days active" value={num(eng.days_active_30d)} />
            <Stat label="Streak" value={num(eng.current_streak)} />
            <Stat label="Lessons done" value={num(eng.lessons_completed)} />
            <Stat label="Days active all time" value={num(eng.total_days_active)} />
          </div>
        </div>
      )}

      {answers.length > 0 && (
        <div className="mt-3">
          <p className="micro-label mb-1">Last event answers</p>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <div key={`${a.event_title}-${i}`} className="rounded-lg border border-border/50 bg-background/40 p-2">
                <p className="text-[12px] font-semibold text-foreground">
                  {a.event_title || 'Event'}
                  {a.event_date ? ` · ${new Date(a.event_date).toLocaleDateString()}` : ''}
                </p>
                {answerLines(a.answers).map((line, j) => (
                  <p key={j} className="text-[13px] leading-snug text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.captured_at && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Captured {new Date(snapshot.captured_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
