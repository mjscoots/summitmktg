import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

/**
 * Smart notification generator that creates in-app notifications for:
 * 1. 100% training completion (rep completes all training)
 * 2. New reps joining the site (new user signup)
 * 3. 10+ unread chat messages (chat backlog alert)
 * 4. New #1 on leaderboard (leaderboard shake-up)
 * 5. Daily streak milestones (3, 7, 14, 21, 30 day streaks)
 * 6. Calendar events starting within 15 minutes
 */
export function useSmartNotifications() {
  const { user, role } = useAuth();
  const { prefs, loaded } = useNotificationPreferences(user?.id);
  const hasCheckedRef = useRef(false);
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  useEffect(() => {
    if (!user?.id || hasCheckedRef.current || !loaded) return;
    hasCheckedRef.current = true;

    // Run checks based on preferences
    if (prefs.chat_mentions) checkUnreadChatMessages();
    if (prefs.leaderboard) checkLeaderboardChanges();
    if (prefs.calendar_events) checkUpcomingEvents();
    if (prefs.streak_milestones) checkStreakMilestones();
    if (prefs.training_quiz) checkTrainingMilestones();

    // Only managers get new-rep-join + streak-break notifications
    let cleanupSub: (() => void) | undefined;
    if (isManager) {
      cleanupSub = subscribeToNewUsers();
      if (prefs.streak_milestones) checkStreakBreaksForManager();
    }

    return () => {
      cleanupSub?.();
    };
  }, [user?.id, isManager, loaded, prefs]);

  // ─── 3. 10+ unread chat messages ────────────────────────────
  const checkUnreadChatMessages = async () => {
    if (!user?.id) return;
    try {
      // Get last time user sent a message or the last time we notified
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('is_ai', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const since = lastMsg?.created_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .neq('user_id', user.id)
        .eq('is_ai', false)
        .gt('created_at', since);

      if (count && count >= 10) {
        // Check if we already notified recently (within 6 hours)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const { count: recentNotif } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .ilike('title', '%unread messages%')
          .gt('created_at', sixHoursAgo);

        if (!recentNotif || recentNotif === 0) {
          await supabase.from('user_notifications').insert({
            user_id: user.id,
            title: `💬 ${count}+ unread messages`,
            message: `You have ${count} new messages in the team chat. Jump in and stay connected!`,
            link: '/app/chat',
          });
        }
      }
    } catch (err) {
      console.error('Chat notification check failed:', err);
    }
  };

  // ─── 4. New #1 on leaderboard ────────────────────────────
  const checkLeaderboardChanges = async () => {
    if (!user?.id) return;
    try {
      const currentWeek = getWeekStart();

      // Get current #1 on training leaderboard
      const { data: topTraining } = await supabase
        .from('leaderboard_points')
        .select('user_id, training_points')
        .eq('week_start', currentWeek)
        .order('training_points', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (topTraining && topTraining.user_id === user.id && (topTraining.training_points || 0) > 0) {
        // Check if already notified this week
        const { count: existing } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .ilike('title', '%#1%')
          .gt('created_at', currentWeek);

        if (!existing || existing === 0) {
          await supabase.from('user_notifications').insert({
            user_id: user.id,
            title: '\u{1F3C6} You are #1 on the leaderboard!',
            message: 'You just took the top spot on the training leaderboard this week. Keep dominating!',
            link: '/app/leaderboard',
          });
        }
      }
    } catch (err) {
      console.error('Leaderboard notification check failed:', err);
    }
  };

  // ─── 6. Calendar events starting within 15 min ────────────
  const checkUpcomingEvents = async () => {
    if (!user?.id) return;
    try {
      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 60 * 1000);

      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, event_date')
        .gte('event_date', now.toISOString())
        .lte('event_date', in15.toISOString())
        .limit(3);

      if (!events?.length) return;

      for (const event of events) {
        // Check if already notified for this event
        const { count: existing } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('event_id', event.id);

        if (!existing || existing === 0) {
          await supabase.from('user_notifications').insert({
            user_id: user.id,
            title: `⏰ "${event.title}" starting soon`,
            message: `Your event "${event.title}" starts in less than 15 minutes.`,
            link: '/app/calendar',
            event_id: event.id,
          });
        }
      }
    } catch (err) {
      console.error('Calendar notification check failed:', err);
    }
  };

  // ─── 7. Streak milestones (3, 7, 14, 21, 30 days) ────────
  const checkStreakMilestones = async () => {
    if (!user?.id) return;
    try {
      const { data: streak } = await supabase
        .from('daily_login_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!streak) return;
      const milestones = [3, 7, 14, 21, 30, 50, 100];
      const hit = milestones.find(m => streak.current_streak === m);
      if (!hit) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const { count: existing } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .ilike('title', `%${hit}-day streak%`)
        .gt('created_at', todayStr);

      if (!existing || existing === 0) {
        await supabase.from('user_notifications').insert({
          user_id: user.id,
          title: `🔥 ${hit}-day streak!`,
          message: `You've logged in ${hit} days in a row. That's elite consistency — keep it going!`,
          link: '/app',
        });
      }
    } catch (err) {
      console.error('Streak milestone check failed:', err);
    }
  };

  // ─── 8. Training milestones (25%, 50%, 75%, 100%) ────────
  const checkTrainingMilestones = async () => {
    if (!user?.id) return;
    try {
      const { data: lessons } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const completed = lessons?.length || 0;
      if (completed === 0) return;

      // Check for round-number milestones
      const milestones = [5, 10, 25, 50];
      const hit = milestones.find(m => completed === m);
      if (!hit) return;

      const { count: existing } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .ilike('title', `%${hit} lessons%`);

      if (!existing || existing === 0) {
        await supabase.from('user_notifications').insert({
          user_id: user.id,
          title: `📚 ${hit} lessons completed!`,
          message: `You just finished your ${hit}th lesson. The grind is paying off!`,
          link: '/app/training',
        });
      }
    } catch (err) {
      console.error('Training milestone check failed:', err);
    }
  };

  // ─── 9. Streak breaks for managers ────────────────────────
  const checkStreakBreaksForManager = async () => {
    if (!user?.id) return;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: breaks } = await supabase
        .from('streak_breaks')
        .select('id, user_id, streak_count')
        .eq('manager_user_id', user.id)
        .eq('acknowledged', false)
        .gt('broke_at', oneDayAgo)
        .limit(5);

      if (!breaks?.length) return;

      // Get names
      const userIds = breaks.map(b => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      for (const b of breaks) {
        const name = nameMap.get(b.user_id) || 'A rep';
        const { count: existing } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .ilike('title', `%${name}%streak%`)
          .gt('created_at', oneDayAgo);

        if (!existing || existing === 0) {
          await supabase.from('user_notifications').insert({
            user_id: user.id,
            title: `⚠️ ${name} broke their ${b.streak_count}-day streak`,
            message: `${name} just lost their login streak. A quick check-in could help them get back on track.`,
            link: '/app/team',
          });
        }
      }
    } catch (err) {
      console.error('Streak break check failed:', err);
    }
  };

  // ─── 2. New rep joins (realtime for managers) ─────────────
  const subscribeToNewUsers = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel('smart-new-users')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          const newProfile = payload.new as { user_id: string; full_name: string; email: string };
          if (newProfile.user_id === user.id) return;

          await supabase.from('user_notifications').insert({
            user_id: user.id,
            title: `👋 New rep joined: ${newProfile.full_name}`,
            message: `${newProfile.full_name} (${newProfile.email}) just signed up. Welcome them to the team!`,
            link: '/app/team',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return null;
}

// ─── Helpers ──────────────────────────────────────────────
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}
