import { useAuth } from '@/hooks/useAuth';

/**
 * Pass 129 - who may write which events. Owner, admin and presidents are
 * unrestricted; a manager writes only for the team he sits on or leads. The
 * database enforces this through can_write_event(); this only keeps the forms
 * honest so a manager never submits a write the server will refuse.
 */
export function useEventScope() {
  const { role, profile } = useAuth();
  const unrestricted = role === 'owner' || role === 'admin' || role === 'president';
  const teamId = ((profile as any)?.team_id as string | null) ?? null;
  return { unrestricted, teamId };
}
