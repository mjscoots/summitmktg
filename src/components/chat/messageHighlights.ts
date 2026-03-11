/**
 * Determine message highlight class based on reaction count.
 *  3+ reactions → subtle highlight border
 *  8+ reactions → glowing border
 * 15+ reactions → top insight
 */
export function getMessageHighlight(reactionCount: number): {
  className: string;
  badge: string | null;
  isHot: boolean;
} {
  if (reactionCount >= 15) {
    return {
      className: 'ring-1 ring-amber-500/40 bg-amber-500/[0.03] rounded-lg',
      badge: '⭐ Top Insight',
      isHot: true,
    };
  }
  if (reactionCount >= 8) {
    return {
      className: 'ring-1 ring-primary/30 bg-primary/[0.02] rounded-lg shadow-[0_0_8px_-2px_hsl(var(--primary)/0.15)]',
      badge: null,
      isHot: true,
    };
  }
  if (reactionCount >= 3) {
    return {
      className: 'ring-1 ring-border/60 rounded-lg',
      badge: null,
      isHot: false,
    };
  }
  return { className: '', badge: null, isHot: false };
}

/**
 * Detect "hot thread" — message that got multiple reactions quickly.
 * We check if a message has 5+ reactions and was created within last 30 min.
 */
export function isHotThread(reactionCount: number, messageCreatedAt: string): boolean {
  if (reactionCount < 5) return false;
  const age = Date.now() - new Date(messageCreatedAt).getTime();
  return age < 30 * 60 * 1000; // 30 minutes
}
