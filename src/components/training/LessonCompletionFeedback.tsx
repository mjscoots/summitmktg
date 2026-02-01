import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
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

export function LessonCompletionFeedback({
  lessonTitle,
  progressBefore,
  progressAfter,
  onComplete,
  isRookieCourse = true,
}: LessonCompletionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(progressBefore);

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

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const progressGain = progressAfter - progressBefore;

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
          <h3 className="text-xl font-black text-foreground">Lesson Complete!</h3>
          <Sparkles className={cn(
            "w-5 h-5",
            isRookieCourse ? "text-green-400" : "text-blue-400"
          )} />
        </div>

        {/* Lesson Title */}
        <p className="text-muted-foreground mb-6 line-clamp-1">
          {lessonTitle}
        </p>

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
                "text-3xl font-black",
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
          <p className="text-xs text-muted-foreground mt-1">
            Course Progress
          </p>
        </div>

        {/* Motivational Message */}
        <p className={cn(
          "text-sm font-medium",
          isRookieCourse ? "text-green-400" : "text-blue-400"
        )}>
          {progressAfter < 25 
            ? "You're just getting started. Keep going!"
            : progressAfter < 50
            ? "Building momentum. You're proving yourself."
            : progressAfter < 75
            ? "Over halfway there. You're in the zone."
            : progressAfter < 100
            ? "Almost there. Finish what you started."
            : "Course complete! You showed up. You won."}
        </p>
      </div>
    </div>
  );
}
