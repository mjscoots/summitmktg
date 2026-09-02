import { useAuth } from '@/hooks/useAuth';

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Pass 140 - one quiet line above Updates. The row keeps its height whether or
 * not the name has loaded yet, so Home never shifts underneath a reader.
 */
export function HomeGreeting() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || '';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <p className="flex h-5 items-center truncate text-[13px] leading-5 text-muted-foreground">
      {firstName ? `${timeOfDay()}, ${firstName} · ${today}` : today}
    </p>
  );
}

export default HomeGreeting;
