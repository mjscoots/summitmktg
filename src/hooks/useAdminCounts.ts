import { useAdminQueue, type QueueCounts } from '@/hooks/useAdminQueue';

export type AdminCounts = QueueCounts;

/**
 * Admin badge counts.
 * Thin wrapper over useAdminQueue so the sidebar badge, the Home queue pulse
 * and the Queue triage view are always derived from the exact same item list
 * (dismissed items excluded).
 */
export function useAdminCounts(): AdminCounts {
  const { counts } = useAdminQueue();
  return counts;
}
