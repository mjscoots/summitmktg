import { useEffect, useState } from 'react';
import { Mountain, Flame, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreak } from '@/hooks/useStreak';

interface WelcomeBannerProps {
  userName?: string;
  lessonsCompleted: number;
  onDismiss?: () => void;
}

// Messages for different stages of the journey
const JOURNEY_MESSAGES = [
  {
    threshold: 0,
    title: "Welcome to Summit",
    message: "You just took the first step. Most people never do.",
    subtext: "This is where your story changes.",
    icon: Mountain,
  },
  {
    threshold: 1,
    title: "You Showed Up",
    message: "Day 1 is done. That's more than most ever do.",
    subtext: "Tomorrow, show up again.",
    icon: Flame,
  },
  {
    threshold: 3,
    title: "Building Momentum",
    message: "Three lessons in. You're not just trying — you're becoming.",
    subtext: "The grind is earning your future.",
    icon: Flame,
  },
  {
    threshold: 5,
    title: "You're Different",
    message: "Most people quit by now. You didn't.",
    subtext: "That's who you are now.",
    icon: Users,
  },
  {
    threshold: 10,
    title: "You're One of Us",
    message: "You've proven you belong here.",
    subtext: "Welcome to the team.",
    icon: Users,
  },
];

export function WelcomeBanner({
  userName,
  lessonsCompleted,
  onDismiss,
}: WelcomeBannerProps) {
  const { streakData, getStreakMessage } = useStreak();
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Find appropriate message based on lessons completed
  const currentMessage = [...JOURNEY_MESSAGES]
    .reverse()
    .find(m => lessonsCompleted >= m.threshold) || JOURNEY_MESSAGES[0];

  const Icon = currentMessage.icon;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  // Don't show after 10 lessons unless streak is notable
  if (lessonsCompleted > 10 && streakData.currentStreak < 3) {
    return null;
  }

  return (
    <div className={cn(
      "relative mb-6 p-5 rounded-xl overflow-hidden transition-all duration-300",
      // Subtle, non-interactive styling - lower contrast than cards
      "bg-muted/30 border border-border/50",
      // No hover effects - this is informational only
      "select-none",
      isExiting ? "opacity-0 -translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
    )}>
      {/* Removed X button - persistent banner */}

      <div className="relative flex items-start gap-4">
        {/* Icon - muted styling */}
        <div className="p-2.5 rounded-lg bg-muted/50 text-muted-foreground flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground/90 mb-0.5">
            {currentMessage.title}
            {userName && lessonsCompleted === 0 && (
              <span className="text-muted-foreground">, {userName.split(' ')[0]}</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            {currentMessage.message}
          </p>
          <p className="text-xs text-muted-foreground/80">
            {currentMessage.subtext}
          </p>

          {/* Streak info */}
          {streakData.currentStreak > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Flame className="w-3.5 h-3.5 text-orange-400/70" />
              <span className="text-muted-foreground/80">
                {getStreakMessage()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
