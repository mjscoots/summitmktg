import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isFuture, isToday, isAfter, isBefore, addDays, addMonths, startOfWeek, endOfWeek, format } from 'date-fns';

interface CalendarEvent {
  id: string;
  event_date: string;
  end_date: string | null;
  event_type: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  is_team_wide: boolean;
  manager_id: string | null;
  created_by: string | null;
}

const isRecurring = (event: CalendarEvent) => {
  return event.recurrence_type && event.recurrence_type !== 'none';
};

export function usePendingRSVP() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());

        // Fetch user's assigned event IDs
        const { data: assignments } = await supabase
          .from('calendar_event_assignees')
          .select('event_id')
          .eq('user_id', user.id);
        const assignedIds = new Set((assignments || []).map(a => a.event_id));

        // Fetch all events
        const { data: events } = await supabase
          .from('calendar_events')
          .select('id, event_date, end_date, event_type, recurrence_type, recurrence_interval, recurrence_end_date, recurrence_count, is_team_wide, manager_id, created_by')
          .order('event_date');

        if (!events) { setPendingCount(0); return; }

        // Filter to events relevant to this user
        const relevant = events.filter(e =>
          e.created_by === user.id || e.manager_id === user.id || e.is_team_wide || assignedIds.has(e.id)
        );

        // Expand recurring events for the current week only
        const allInstances: { id: string; date: Date; event_type: string | null; recurring: boolean }[] = [];

        relevant.forEach(event => {
          const baseDate = new Date(event.event_date);
          const recurring = isRecurring(event);
          
          // Add base instance if within this week
          if ((isFuture(baseDate) || isToday(baseDate)) && !isAfter(baseDate, weekEnd) && !isBefore(baseDate, weekStart)) {
            allInstances.push({ id: event.id, date: baseDate, event_type: event.event_type, recurring: !!recurring });
          }

          if (!recurring) return;

          const interval = event.recurrence_interval || 1;
          const recEnd = event.recurrence_end_date ? new Date(event.recurrence_end_date) : null;
          const maxCount = event.recurrence_count || 200;
          let count = 0;
          let cursor = baseDate;

          const advance = (d: Date): Date => {
            switch (event.recurrence_type) {
              case 'daily': return addDays(d, interval);
              case 'weekly': return addDays(d, 7 * interval);
              case 'biweekly': return addDays(d, 14);
              case 'monthly': return addMonths(d, interval);
              default: return addDays(d, 7);
            }
          };

          cursor = advance(cursor);
          while (count < maxCount) {
            if (recEnd && isAfter(cursor, recEnd)) break;
            if (isAfter(cursor, weekEnd)) break;
            if ((isFuture(cursor) || isToday(cursor)) && !isBefore(cursor, weekStart)) {
              allInstances.push({ id: event.id, date: cursor, event_type: event.event_type, recurring: true });
            }
            cursor = advance(cursor);
            count++;
          }
        });

        // Get user's existing attendance records with updated_at
        const { data: attendanceData } = await supabase
          .from('calendar_attendance')
          .select('event_id, updated_at')
          .eq('user_id', user.id);
        const attendanceMap = new Map((attendanceData || []).map(a => [a.event_id, a.updated_at]));

        // Count events without a current-week response
        const pending = allInstances.filter(inst => {
          const updatedAt = attendanceMap.get(inst.id);
          if (!updatedAt) return true; // No response at all
          // For recurring events, require weekly re-confirmation
          if (inst.recurring) {
            return new Date(updatedAt) < weekStart;
          }
          return false;
        });
        
        setPendingCount(pending.length);
      } catch {
        setPendingCount(0);
      }
    };

    check();

    // Re-check when tab becomes visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user]);

  return pendingCount;
}
