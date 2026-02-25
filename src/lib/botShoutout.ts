import { supabase } from '@/integrations/supabase/client';

/**
 * Posts a one-time bot shoutout in the community chat for a major accomplishment.
 * Uses celebration_log table for reliable deduplication across tabs/rerenders.
 */
export async function postBotShoutout(
  userId: string,
  fullName: string,
  type: 'streak' | 'bootcamp' | 'training' | 'deal',
  meta?: { streakDays?: number; deals?: number }
) {
  // For streaks, include the day count in the celebration_type for per-milestone dedup
  const celebrationType = type === 'streak' && meta?.streakDays
    ? `streak_${meta.streakDays}`
    : type;

  const messages: Record<string, string> = {
    streak: `⚡ STREAK ALERT\n${fullName} just locked in **${meta?.streakDays}-day streak.** No days off. 🔥`,
    bootcamp: `🏔️ SUMMER CHECKLIST COMPLETE\n${fullName} just graduated. Another soldier ready for war. ⚔️`,
    training: `🎓 FULLY CERTIFIED\n${fullName} crushed 100% of training. Built different. 🏆`,
    deal: `🔥 DEAL ALERT\n${fullName} just locked down another one.${meta?.deals ? ` That's ${meta.deals} today.` : ''} Momentum is real. 💰`,
  };

  const content = messages[type];
  if (!content) return;

  try {
    // Check celebration_log for dedup (DB-level unique constraint is the real guard)
    const { data: existing } = await supabase
      .from('celebration_log')
      .select('id')
      .eq('user_id', userId)
      .eq('celebration_type', celebrationType)
      .maybeSingle();

    if (existing) {
      console.log(`[botShoutout] Already celebrated ${celebrationType} for ${fullName}`);
      return;
    }

    // Insert into celebration_log FIRST (unique constraint prevents races)
    const { error: logError } = await supabase
      .from('celebration_log')
      .insert({ user_id: userId, celebration_type: celebrationType });

    if (logError) {
      // Unique constraint violation = another call already inserted
      console.log(`[botShoutout] Dedup caught via constraint for ${celebrationType}`);
      return;
    }

    // Only post the chat message if we successfully logged the celebration
    await supabase.from('chat_messages').insert({
      user_id: userId,
      is_ai: true,
      content,
    });
  } catch {
    // Non-critical
  }
}
