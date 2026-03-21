import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock } from 'lucide-react';

interface ScheduleItem {
  id: string;
  day_of_week: number;
  title: string;
  time_pst: string | null;
  description: string | null;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function WeeklySchedule() {
  const { role } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map app role to database role
  const dbRole = isManagerOrAbove(role) ? 'manager' : 'rookie';

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('target_role', dbRole)
          .eq('is_active', true)
          .order('day_of_week');

        if (error) {
          console.error('Error fetching schedule:', error);
          return;
        }

        setSchedule(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [dbRole]);

  // Group items by day
  const scheduleByDay = DAYS.map((day, index) => ({
    short: day,
    full: FULL_DAYS[index],
    dayIndex: index,
    items: schedule.filter(item => item.day_of_week === index)
  })).filter(day => day.items.length > 0);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading schedule...</div>
      </div>
    );
  }

  if (scheduleByDay.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No schedule set</p>
        <p className="text-sm text-muted-foreground/70">Your weekly calendar will appear here</p>
      </div>
    );
  }

  // Get current day index (0 = Sunday)
  const today = new Date().getDay();

  return (
    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
      {scheduleByDay.map((day) => (
        <div 
          key={day.dayIndex}
          className={`p-3 rounded-lg border transition-all ${
            day.dayIndex === today 
              ? 'border-primary/50 bg-primary/5' 
              : 'border-border bg-card/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              day.dayIndex === today 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {day.short}
            </span>
            {day.dayIndex === today && (
              <span className="text-xs text-primary">Today</span>
            )}
          </div>
          <div className="space-y-2">
            {day.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    {item.time_pst && (
                      <span className="text-xs text-primary font-medium">
                        {item.time_pst}
                      </span>
                    )}
                    {!item.time_pst && (
                      <span className="text-xs text-muted-foreground">
                        ALL DAY
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
