import { useMemo } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daysSince, money, outcomeLabel, smsHref, telHref, type LeadRow } from '@/hooks/useLeads';

const CARD = 'rounded-[var(--radius)] border border-border/60 bg-surface';

interface Props {
  rows: LeadRow[];
  onOpen: (id: string) => void;
}

/**
 * Due and overdue call-backs first, then never-contacted leads by revenue.
 * Single source of truth so the This week list and Call mode always agree.
 */
export function buildWeekQueue(rows: LeadRow[]): LeadRow[] {
  const now = Date.now();
  const byRevenue = (a: LeadRow, b: LeadRow) => (b.season_revenue ?? 0) - (a.season_revenue ?? 0);
  const due = rows
    .filter((r) => r.next_call_at && new Date(r.next_call_at).getTime() <= now && !r.do_not_call)
    .sort(byRevenue);
  const fresh = rows
    .filter((r) => !r.last_contact_at && !r.next_call_at && !r.do_not_call)
    .sort(byRevenue);
  return [...due, ...fresh].slice(0, 25);
}

/** Due and overdue call-backs first, then never-contacted leads by revenue. */
export default function ThisWeekQueue({ rows, onOpen }: Props) {
  const queue = useMemo(() => buildWeekQueue(rows), [rows]);


  return (
    <section className="mb-5">
      <h2 className="micro-label mb-2">This week</h2>
      {queue.length === 0 ? (
        <div className={cn(CARD, 'p-6 text-center')}>
          <p className="text-[13px] text-muted-foreground">Nothing due. Pull from your queue below.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((lead) => {
            const since = daysSince(lead.last_contact_at);
            const line = [
              lead.season_revenue != null ? money(lead.season_revenue) : null,
              outcomeLabel(lead.last_outcome),
              since != null ? `${since} day${since === 1 ? '' : 's'} since contact` : 'Never contacted',
              lead.next_call_at ? `Due ${new Date(lead.next_call_at).toLocaleDateString()}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <div key={lead.id} className={cn(CARD, 'flex items-center gap-2 p-3')}>
                <button onClick={() => onOpen(lead.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14px] font-semibold text-foreground">{lead.full_name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{line}</p>
                </button>
                {telHref(lead.phone) && (
                  <a
                    href={telHref(lead.phone) as string}
                    aria-label={`Call ${lead.full_name}`}
                    className="shrink-0 rounded-lg border border-primary/25 bg-primary/10 p-2.5 text-primary"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {smsHref(lead.phone) && (
                  <a
                    href={smsHref(lead.phone) as string}
                    aria-label={`Text ${lead.full_name}`}
                    className="shrink-0 rounded-lg border border-border/60 bg-background/50 p-2.5 text-foreground"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
