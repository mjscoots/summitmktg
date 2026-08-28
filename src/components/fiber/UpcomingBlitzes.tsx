import { useFiberBlitzes } from '@/hooks/useFiberHub';
import { Skeleton } from '@/components/ui/skeleton';
import { FiberEyebrow, HUB_CARD } from '@/components/fiber/FiberHubCards';

/** Upcoming blitz markets, kept in settings so the owner can edit them. */
export function UpcomingBlitzes() {
  const { loading, blitzes } = useFiberBlitzes();

  if (loading) return <Skeleton className="mb-4 h-28 w-full" />;
  if (!blitzes.length) return null;

  return (
    <div className={`${HUB_CARD} mb-4 p-4`}>
      <FiberEyebrow>Upcoming blitzes</FiberEyebrow>
      <ul className="divide-y divide-border">
        {blitzes.map((b) => (
          <li key={b.place} className="py-2.5 first:pt-1 last:pb-1">
            <p className="text-[14px] font-semibold text-foreground">{b.place}</p>
            <p className="text-[12px] text-muted-foreground">
              {b.timing}
              {b.approximate ? ' · timing approximate' : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UpcomingBlitzes;
