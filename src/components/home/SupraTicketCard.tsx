import { useNavigate } from 'react-router-dom';

/**
 * Pass 140 — the Supra card. Only shown when the person actually holds tickets,
 * and it says nothing beyond the count and where the drawing happens.
 */
export function SupraTicketCard({ tickets }: { tickets: number }) {
  const navigate = useNavigate();
  if (tickets <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/app/events')}
      className="relative block w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card px-5 py-6 text-left"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--workspace-accent) / 0.18) 0%, hsl(var(--card)) 55%, hsl(var(--surface-sunken)) 100%)',
        }}
      />
      <span className="relative block">
        <span
          className="block text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'hsl(var(--workspace-accent))' }}
        >
          Supra
        </span>
        <span className="mt-2 block text-[52px] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {tickets}
        </span>
        <span className="mt-1 block text-[15px] text-muted-foreground">
          {tickets === 1 ? 'ticket in your name' : 'tickets in your name'}
        </span>
        <span className="mt-3 block text-[13px] text-muted-foreground">
          Tickets are drawn at events. Open Events to see the next one.
        </span>
      </span>
    </button>
  );
}

export default SupraTicketCard;
