import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const hasCheckedRef = useRef(false);
  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    if (!user?.id || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Run all checks in parallel
    checkUnreadChatMessages();
    checkLeaderboardChanges();
    checkUpcomingEvents();

    // Only managers get new-rep-join notifications
    if (isManager) {
      subscribeToNewUsers();
    }
  }, [user?.id, isManager]);

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
      console.debug('Chat notification check failed:', err);
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
      console.debug('Leaderboard notification check failed:', err);
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
      console.debug('Calendar notification check failed:', err);
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
