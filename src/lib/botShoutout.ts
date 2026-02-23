import { supabase } from '@/integrations/supabase/client';

/**
 * Posts a one-time bot shoutout in the community chat for a major accomplishment.
 * Deduplicates by checking if a similar message already exists for the user.
 */
export async function postBotShoutout(
  userId: string,
  fullName: string,
  type: 'streak' | 'bootcamp' | 'training',
  streakDays?: number
) {
  const messages: Record<string, string> = {
    streak: `🔥 **${fullName}** just hit a **${streakDays}-day streak!** Consistency is king. 👑`,
    bootcamp: `🏔️ **${fullName}** just completed **Bootcamp!** Ready to dominate. 💪`,
    training: `🎓 **${fullName}** finished **100% of training!** Certified beast mode. 🏆`,
  };

  const content = messages[type];
  if (!content) return;

  // Build a dedup key based on type
  const dedupPatterns: Record<string, string> = {
    streak: `%${fullName}%${streakDays}-day streak%`,
    bootcamp: `%${fullName}%completed%Bootcamp%`,
    training: `%${fullName}%100% of training%`,
  };

  try {
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('is_ai', true)
      .ilike('content', dedupPatterns[type])
      .limit(1);

    if (existing?.length) return; // Already posted

    await supabase.from('chat_messages').insert({
      user_id: userId,
      is_ai: true,
      content,
    });
  } catch {
    // Non-critical
  }
}
