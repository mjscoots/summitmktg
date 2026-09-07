/**
 * Determine message highlight class based on reaction count.
 *  3+ reactions → subtle highlight
 *  8+ reactions → accent highlight
 * 15+ reactions → top insight
 */
export function getMessageHighlight(reactionCount: number): {
  className: string;
  badge: string | null;
  isHot: boolean;
} {
  if (reactionCount >= 15) {
    return {
      className: 'bg-primary/[0.06] rounded-lg',
      badge: '⭐ Top Insight',
      isHot: true,
    };
  }
  if (reactionCount >= 8) {
    return {
      className: 'bg-primary/[0.04] rounded-lg',
      badge: null,
      isHot: true,
    };
  }
  if (reactionCount >= 3) {
    return {
      className: 'bg-card rounded-lg',
      badge: null,
      isHot: false,
    };
  }
  return { className: '', badge: null, isHot: false };
}

/**
 * Detect "hot thread" - message that got multiple reactions quickly.
 * We check if a message has 5+ reactions and was created within last 30 min.
 */
export function isHotThread(reactionCount: number, messageCreatedAt: string): boolean {
  if (reactionCount < 5) return false;
  const age = Date.now() - new Date(messageCreatedAt).getTime();
  return age < 30 * 60 * 1000; // 30 minutes
}
