import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleItem {
  id: string;
  day_of_week: number;
  title: string;
  time_pst: string | null;
  description: string | null;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function WeeklyScheduleExpanded() {
  const { role } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dbRole = role === 'manager' || role === 'admin' ? 'manager' : 'rookie';

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

  const scheduleByDay = DAYS.map((day, index) => ({
    short: day,
    dayIndex: index,
    items: schedule.filter(item => item.day_of_week === index)
  })).filter(day => day.items.length > 0);

  const today = new Date().getDay();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">This Week</h2>
      </div>
      
      <div className="p-3 space-y-2">
        {scheduleByDay.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events scheduled</p>
          </div>
        ) : (
          scheduleByDay.map((day) => (
            <div 
              key={day.dayIndex}
              className={cn(
                "p-2.5 rounded-md border transition-all",
                day.dayIndex === today 
                  ? "border-primary/40 bg-primary/5" 
                  : "border-border/30 bg-muted/20"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  day.dayIndex === today 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {day.short}
                </span>
                {day.dayIndex === today && (
                  <span className="text-[10px] text-primary font-medium">Today</span>
                )}
              </div>
              <div className="space-y-1">
                {day.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.title}
                        </span>
                        {item.time_pst && (
                          <span className="text-[10px] text-primary font-medium flex-shrink-0">
                            {item.time_pst}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}