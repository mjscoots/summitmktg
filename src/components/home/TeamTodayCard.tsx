import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { TopRow } from '@/hooks/useHomeToday';

const RING = ['ring-primary', 'ring-primary/70', 'ring-primary/45'];

function Avatar({ row, place }: { row: TopRow; place: number }) {
  const ring = RING[place] || 'ring-border';
  return (
    <UserAvatar
      avatarUrl={row.avatar_url}
      fullName={row.name}
      size="md"
      className={cn('h-9 w-9 text-[13px] ring-2', ring)}
    />
  );
}

/**
 * Today's leaders among the people the caller can see, plus where the caller
 * stands. Empty until someone logs a sale today.
 */
export function TeamTodayCard({
  rows,
  limit = 3,
  myUserId,
  title = 'Team today',
}: {
  rows: TopRow[];
  limit?: number;
  myUserId?: string;
  title?: string;
}) {
  const navigate = useNavigate();
  const top = rows.slice(0, limit);
  const myIndex = rows.findIndex((r) => r.user_id === myUserId);

  return (
    <button
      type="button"
      onClick={() => navigate('/app/leaderboard')}
      className="card-ice w-full space-y-2.5 p-3 text-left"
    >
      <p className="micro-label">{title}</p>
      {top.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No sales logged today yet.</p>
      ) : (
        <ul className="stagger space-y-2">
          {top.map((r, i) => (
            <li key={r.user_id} className="flex items-center gap-3">
              <Avatar row={r} place={i} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{r.name}</span>
              <span className="text-[13px] font-semibold tabular-nums text-primary">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
      {myIndex >= 0 && myIndex + 1 > limit && (
        <p className="border-t border-border pt-2 text-[13px] text-foreground">
          You: #{myIndex + 1} · <span className="tabular-nums">{rows[myIndex].count}</span>
        </p>
      )}
    </button>
  );
}

export default TeamTodayCard;
