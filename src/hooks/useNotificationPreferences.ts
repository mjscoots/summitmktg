import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPrefs {
  training_quiz: boolean;
  calendar_events: boolean;
  leaderboard: boolean;
  chat_mentions: boolean;
  bootcamp_reminders: boolean;
  streak_milestones: boolean;
}

const DEFAULTS: NotificationPrefs = {
  training_quiz: true,
  calendar_events: true,
  leaderboard: true,
  chat_mentions: true,
  bootcamp_reminders: true,
  streak_milestones: true,
};

export function useNotificationPreferences(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            training_quiz: (data as any).training_quiz ?? true,
            calendar_events: (data as any).calendar_events ?? true,
            leaderboard: (data as any).leaderboard ?? true,
            chat_mentions: (data as any).chat_mentions ?? true,
            bootcamp_reminders: (data as any).bootcamp_reminders ?? true,
            streak_milestones: (data as any).streak_milestones ?? true,
          });
        }
        setLoaded(true);
      });
  }, [userId]);

  return { prefs, loaded };
}
