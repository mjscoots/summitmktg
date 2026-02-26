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
  const celebrationType = type === 'streak' && meta?.streakDays
    ? `streak_${meta.streakDays}`
    : type;

  const firstName = fullName.split(' ')[0];

  const messages: Record<string, string> = {
    streak: `${firstName} just locked in a ${meta?.streakDays}-day streak. No days off.`,
    bootcamp: `${firstName} just graduated. Another soldier ready for war.`,
    training: `${firstName} crushed 100% of training. Built different.`,
    deal: `${firstName} just closed another one.${meta?.deals ? ` That's ${meta.deals} today.` : ''} Momentum is real.`,
  };

  const content = messages[type];
  if (!content) return;

  try {
    const { data: existing } = await supabase
      .from('celebration_log')
      .select('id')
      .eq('user_id', userId)
      .eq('celebration_type', celebrationType)
      .maybeSingle();

    if (existing) return;

    const { error: logError } = await supabase
      .from('celebration_log')
      .insert({ user_id: userId, celebration_type: celebrationType });

    if (logError) return;

    await supabase.from('chat_messages').insert({
      user_id: userId,
      is_ai: true,
      content,
    });
  } catch {
    // Non-critical
  }
}
