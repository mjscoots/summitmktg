import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Target, Clock, MessageSquare, BookOpen, CheckCircle, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Objective {
  type: string;
  label: string;
  current: number;
  target: number;
  complete: boolean;
}

interface ChallengeData {
  challenge_date: string;
  objectives: Objective[];
  bonus_points: number;
  bonus_awarded: boolean;
  all_complete: boolean;
}

const OBJECTIVE_ICONS: Record<string, typeof Clock> = {
  training: Clock,
  chat: MessageSquare,
  lessons: BookOpen,
};

const OBJECTIVE_COLORS: Record<string, string> = {
  training: 'text-primary',
  chat: 'text-blue-400',
  lessons: 'text-primary',
};

export function DailyChallenge() {
  const { user } = useAuth();
  const [data, setData] = useState<ChallengeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChallenge = useCallback(async () => {
    if (!user) return;
    try {
      const { data: raw, error } = await (supabase.rpc as any)('get_daily_challenge', { _user_id: user.id });
      if (error) {
        console.error('Daily challenge error:', error);
        return;
      }
      
      // Check if bonus was just awarded
      if (raw.all_complete && !data?.all_complete) {
        toast.success(`Daily Challenge complete! +${raw.bonus_points} pts bonus!`);
      }
      
      setData(raw);
    } catch (err) {
      console.error('Challenge fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, data?.all_complete]);

  useEffect(() => {
    fetchChallenge();
    const interval = setInterval(fetchChallenge, 30_000);
    return () => clearInterval(interval);
  }, [fetchChallenge]);

  if (isLoading || !data) {
    return <div className="bg-card rounded-xl border border-border p-4 mb-4 animate-pulse h-32" />;
  }

  const completedCount = data.objectives.filter(o => o.complete).length;
  const totalCount = data.objectives.length;
  const allDone = data.all_complete;

  return (
    <div className={cn(
      "bg-card rounded-xl border p-4 mb-4 transition-all",
      allDone ? "border-success/30" : "border-border"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Target className={cn("w-4 h-4", allDone ? "text-success" : "text-primary")} />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Daily Challenge</h2>
        <span className={cn(
          "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full",
          allDone 
            ? "bg-success/15 text-success" 
            : "bg-muted text-muted-foreground"
        )}>
          {completedCount}/{totalCount}
        </span>
      </div>

      <div className="space-y-2.5">
        {data.objectives.map((obj) => {
          const Icon = OBJECTIVE_ICONS[obj.type] || Target;
          const color = OBJECTIVE_COLORS[obj.type] || 'text-primary';
          const percent = Math.min((obj.current / obj.target) * 100, 100);

          return (
            <div key={obj.type} className="flex items-center gap-3">
              <div className={cn("shrink-0", obj.complete ? "text-success" : color)}>
                {obj.complete ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    "text-xs font-medium",
                    obj.complete ? "text-success line-through" : "text-foreground"
                  )}>
                    {obj.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {obj.type === 'training' 
                      ? `${Math.round(obj.current)}/${obj.target} min`
                      : `${obj.current}/${obj.target}`
                    }
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      obj.complete ? "bg-success" : "bg-primary"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus reward */}
      <div className={cn(
        "mt-3 flex items-center gap-2 p-2 rounded-lg",
        allDone ? "bg-success/10" : "bg-muted/30"
      )}>
        <Gift className={cn("w-3.5 h-3.5", allDone ? "text-success" : "text-muted-foreground")} />
        <span className={cn(
          "text-xs font-medium",
          allDone ? "text-success" : "text-muted-foreground"
        )}>
          {allDone 
            ? `+${data.bonus_points} pts bonus earned!` 
            : `Complete all 3 for +${data.bonus_points} pts bonus`
          }
        </span>
      </div>
    </div>
  );
}
