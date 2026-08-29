import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPrefs {
  training_quiz: boolean;
  calendar_events: boolean;
  leaderboard: boolean;
  chat_mentions: boolean;
  announcements: boolean;
  bootcamp_reminders: boolean;
  streak_milestones: boolean;
}

const DEFAULTS: NotificationPrefs = {
  training_quiz: true,
  calendar_events: true,
  leaderboard: true,
  chat_mentions: true,
  announcements: true,
  bootcamp_reminders: true,
  streak_milestones: true,
};

/**
 * Pass 129 — one read path for notification settings. The database RPC writes
 * the sensible defaults the first time a person opens the app, so every screen
 * that gates a badge or a toast reads the same flags.
 */
export function useNotificationPreferences(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    void (async () => {
      const { data } = await (supabase as any).rpc('my_notification_prefs');
      if (data && !data.error) {
        setPrefs({
          training_quiz: data.training_quiz ?? true,
          calendar_events: data.calendar_events ?? true,
          leaderboard: data.leaderboard ?? true,
          chat_mentions: data.chat_mentions ?? true,
          announcements: data.announcements ?? true,
          bootcamp_reminders: data.bootcamp_reminders ?? true,
          streak_milestones: data.streak_milestones ?? true,
        });
      }
      setLoaded(true);
    })();
  }, [userId]);

  return { prefs, loaded };
}
