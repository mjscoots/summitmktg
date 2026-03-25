import { useEffect, useState } from 'react';
import { Flame, Zap, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakCelebrationProps {
  streak: number;
  milestone?: number | null;
  message: string;
  onComplete: () => void;
  isRookieCourse?: boolean;
}

export function StreakCelebration({
  streak,
  milestone,
  message,
  onComplete,
  isRookieCourse = true,
}: StreakCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [countUp, setCountUp] = useState(0);

  // Animate the streak number counting up
  useEffect(() => {
    const steps = Math.min(streak, 15);
    const inc = streak / steps;
    let cur = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      cur += inc;
      setCountUp(Math.round(cur));
      if (step >= steps) { clearInterval(timer); setCountUp(streak); }
    }, 60);
    return () => clearInterval(timer);
  }, [streak]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getMilestoneIcon = () => {
    if (milestone && milestone >= 30) return <Trophy className="w-8 h-8" />;
    if (milestone && milestone >= 7) return <Star className="w-8 h-8" />;
    if (streak >= 3) return <Zap className="w-8 h-8" />;
    return <Flame className="w-8 h-8" />;
  };

  const getMilestoneTitle = () => {
    if (milestone === 1) return "First Spark";
    if (milestone === 3) return "3-Day Fire";
    if (milestone === 7) return "One Week Strong";
    if (milestone === 14) return "Two Weeks Dominant";
    if (milestone === 21) return "21 Days — Habit Formed";
    if (milestone === 30) return "30 Days — Legendary";
    return `${streak} Day Streak`;
  };

  // Calculate bonus points for milestone display
  const getBonusPoints = () => {
    if (milestone === 3) return 50;
    if (milestone === 7) return 150;
    if (milestone === 14) return 300;
    if (milestone === 21) return 500;
    if (milestone === 30) return 1000;
    return 10;
  };

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    )}>
      <div className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-2xl border-2 backdrop-blur-sm",
        isRookieCourse
          ? "bg-primary/10 border-primary/50 shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)]"
          : "bg-blue-500/10 border-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)]"
      )}>
        {/* Animated Icon */}
        <div className={cn(
          "p-3 rounded-xl animate-pulse",
          isRookieCourse ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400"
        )}>
          {getMilestoneIcon()}
        </div>

        {/* Content */}
        <div>
          <h3 className={cn(
            "font-black text-lg",
            isRookieCourse ? "text-primary" : "text-blue-400"
          )}>
            {getMilestoneTitle()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          {/* Bonus points badge */}
          {milestone && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-scale-in",
              isRookieCourse
                ? "bg-primary/20 text-primary"
                : "bg-blue-500/20 text-blue-400"
            )}>
              <Zap className="w-3 h-3" />
              +{getBonusPoints()} bonus pts
            </div>
          )}
        </div>

        {/* Streak Number with count-up */}
        <div className={cn(
          "flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg",
          isRookieCourse ? "bg-primary/20" : "bg-blue-500/20"
        )}>
          <span className={cn(
            "text-2xl font-black tabular-nums",
            isRookieCourse ? "text-primary" : "text-blue-400"
          )}>
            {countUp}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            days
          </span>
        </div>
      </div>
    </div>
  );
}
