import { useEffect, useState } from 'react';
import { Mountain, Flame, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Find appropriate message based on lessons completed
  const currentMessage = [...JOURNEY_MESSAGES]
    .reverse()
    .find(m => lessonsCompleted >= m.threshold) || JOURNEY_MESSAGES[0];

  const Icon = currentMessage.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  if (!isVisible) return null;

  // Don't show after 10 lessons unless streak is notable
  if (lessonsCompleted > 10 && streakData.currentStreak < 3) {
    return null;
  }

  return (
    <div className={cn(
      "relative mb-6 p-6 rounded-xl border-2 overflow-hidden transition-all duration-300",
      "bg-gradient-to-br from-green-500/10 via-card to-card",
      "border-green-500/30 shadow-[0_0_40px_-15px_rgba(34,197,94,0.3)]",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
    )}>
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.15)_0%,transparent_50%)]" />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="p-3 rounded-xl bg-green-500/20 text-green-400 flex-shrink-0">
          <Icon className="w-8 h-8" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-foreground mb-1">
            {currentMessage.title}
            {userName && lessonsCompleted === 0 && (
              <span className="text-green-400">, {userName.split(' ')[0]}</span>
            )}
          </h2>
          <p className="text-muted-foreground mb-2">
            {currentMessage.message}
          </p>
          <p className="text-sm text-green-400 font-medium">
            {currentMessage.subtext}
          </p>

          {/* Streak info */}
          {streakData.currentStreak > 0 && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-muted-foreground">
                {getStreakMessage()}
              </span>
            </div>
          )}
        </div>

        {/* Continue Button */}
        {lessonsCompleted > 0 && (
          <Button
            onClick={handleDismiss}
            className="bg-green-500 hover:bg-green-600 font-bold gap-2 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
