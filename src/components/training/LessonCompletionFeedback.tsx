import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonCompletionFeedbackProps {
  lessonTitle: string;
  progressBefore: number;
  progressAfter: number;
  onComplete: () => void;
  isRookieCourse?: boolean;
}

// Confetti particle component
function ConfettiParticle({ delay, isRookie }: { delay: number; isRookie: boolean }) {
  const [style] = useState(() => ({
    left: `${Math.random() * 100}%`,
    animationDelay: `${delay}ms`,
    animationDuration: `${1000 + Math.random() * 500}ms`,
    backgroundColor: isRookie 
      ? `hsl(${142 + Math.random() * 20}, 70%, ${45 + Math.random() * 20}%)`
      : `hsl(${210 + Math.random() * 20}, 80%, ${50 + Math.random() * 20}%)`,
    width: `${4 + Math.random() * 4}px`,
    height: `${4 + Math.random() * 4}px`,
  }));

  return (
    <div
      className="absolute top-0 rounded-full animate-confetti-fall"
      style={style}
    />
  );
}

// XP Points counter that counts up
function XPCounter({ points, isRookie }: { points: number; isRookie: boolean }) {
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    const steps = 15;
    const increment = points / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current += increment;
      setDisplayPoints(Math.round(current));
      if (step >= steps) {
        clearInterval(timer);
        setDisplayPoints(points);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [points]);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold animate-scale-in",
      isRookie
        ? "bg-green-500/20 text-green-400 border border-green-500/30"
        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
    )}>
      <Zap className="w-4 h-4" />
      +{displayPoints} XP
    </div>
  );
}

export function LessonCompletionFeedback({
  lessonTitle,
  progressBefore,
  progressAfter,
  onComplete,
  isRookieCourse = true,
}: LessonCompletionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(progressBefore);
  const [showXP, setShowXP] = useState(false);

  // Animate progress number
  useEffect(() => {
    const duration = 1000;
    const steps = 20;
    const increment = (progressAfter - progressBefore) / steps;
    let current = progressBefore;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      setDisplayProgress(Math.round(current));
      
      if (step >= steps) {
        clearInterval(timer);
        setDisplayProgress(progressAfter);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [progressBefore, progressAfter]);

  // Show XP after a short delay for sequential dopamine hits
  useEffect(() => {
    const timer = setTimeout(() => setShowXP(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 3.5 seconds (slightly longer to enjoy the moment)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const progressGain = progressAfter - progressBefore;
  const xpEarned = Math.max(25, Math.round(progressGain * 5));

  // Dynamic motivational message based on progress
  const getMessage = () => {
    if (progressAfter >= 100) return "Course complete. You earned this.";
    if (progressAfter >= 75) return "Almost there. Finish what you started.";
    if (progressAfter >= 50) return "Over halfway. You're in the zone.";
    if (progressAfter >= 25) return "Building momentum. Proving yourself.";
    return "You're just getting started. Keep going.";
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 50} isRookie={isRookieCourse} />
        ))}
      </div>

      {/* Content */}
      <div className={cn(
        "relative z-10 text-center px-8 py-10 max-w-sm mx-4 rounded-2xl border-2 transition-all duration-500",
        isVisible ? "scale-100" : "scale-95",
        isRookieCourse
          ? "bg-card border-green-500/50 shadow-[0_0_60px_-15px_rgba(34,197,94,0.5)]"
          : "bg-card border-blue-500/50 shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)]"
      )}>
        {/* Success Icon */}
        <div className={cn(
          "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 animate-scale-in",
          isRookieCourse ? "bg-green-500/20" : "bg-blue-500/20"
        )}>
          <CheckCircle2 className={cn(
            "w-8 h-8",
            isRookieCourse ? "text-green-400" : "text-blue-400"
          )} />
        </div>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className={cn(
            "w-5 h-5",
            isRookieCourse ? "text-green-400" : "text-blue-400"
          )} />
          <h3 className="text-xl font-black text-foreground">Lesson Complete</h3>
          <Sparkles className={cn(
            "w-5 h-5",
            isRookieCourse ? "text-green-400" : "text-blue-400"
          )} />
        </div>

        {/* Lesson Title */}
        <p className="text-muted-foreground mb-4 line-clamp-1">
          {lessonTitle}
        </p>

        {/* XP Badge — delayed entrance */}
        {showXP && (
          <div className="flex justify-center mb-4">
            <XPCounter points={xpEarned} isRookie={isRookieCourse} />
          </div>
        )}

        {/* Progress Display */}
        <div className={cn(
          "p-4 rounded-xl mb-4",
          isRookieCourse ? "bg-green-500/10" : "bg-blue-500/10"
        )}>
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className={cn(
              "w-5 h-5",
              isRookieCourse ? "text-green-400" : "text-blue-400"
            )} />
            <div>
              <span className={cn(
                "text-3xl font-black tabular-nums",
                isRookieCourse ? "text-green-400" : "text-blue-400"
              )}>
                {displayProgress}%
              </span>
              {progressGain > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  (+{progressGain}%)
                </span>
              )}
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="mt-3 h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                isRookieCourse
                  ? "bg-gradient-to-r from-green-500 to-green-400"
                  : "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Course Progress
          </p>
        </div>

        {/* Motivational Message */}
        <p className={cn(
          "text-sm font-medium",
          isRookieCourse ? "text-green-400" : "text-blue-400"
        )}>
          {getMessage()}
        </p>
      </div>
    </div>
  );
}
