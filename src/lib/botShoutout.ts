import { supabase } from '@/integrations/supabase/client';

/**
 * Posts a one-time bot shoutout in the community chat for a major accomplishment.
 * Enhanced with War Room energy and momentum language.
 */
export async function postBotShoutout(
  userId: string,
  fullName: string,
  type: 'streak' | 'bootcamp' | 'training' | 'deal' | 'new_member',
  meta?: { streakDays?: number; deals?: number }
) {
  const messages: Record<string, string> = {
    streak: `⚡ STREAK ALERT\n${fullName} just locked in **${meta?.streakDays}-day streak.** No days off. 🔥`,
    bootcamp: `🏔️ BOOTCAMP COMPLETE\n${fullName} just graduated. Another soldier ready for war. ⚔️`,
    training: `🎓 FULLY CERTIFIED\n${fullName} crushed 100% of training. Built different. 🏆`,
    deal: `🔥 DEAL ALERT\n${fullName} just locked down another one.${meta?.deals ? ` That's ${meta.deals} today.` : ''} Momentum is real. 💰`,
    new_member: `🚀 NEW CLOSER ENTERED THE BUILDING\n${fullName} just joined the team.\nLet's see what they're made of. ⚔️`,
  };

  const content = messages[type];
  if (!content) return;

  const dedupPatterns: Record<string, string> = {
    streak: `%${fullName}%${meta?.streakDays}-day streak%`,
    bootcamp: `%${fullName}%graduated%`,
    training: `%${fullName}%100% of training%`,
    deal: `%DEAL ALERT%${fullName}%`,
    new_member: `%NEW CLOSER%${fullName}%`,
  };

  try {
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('is_ai', true)
      .ilike('content', dedupPatterns[type])
      .limit(1);

    if (existing?.length) return;

    await supabase.from('chat_messages').insert({
      user_id: userId,
      is_ai: true,
      content,
    });
  } catch {
    // Non-critical
  }
}
