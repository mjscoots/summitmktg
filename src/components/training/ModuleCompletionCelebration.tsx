import { useEffect, useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModuleCompletionCelebrationProps {
  moduleName: string;
  nextModuleName?: string;
  onContinue: () => void;
  isRookieCourse: boolean;
}

export function ModuleCompletionCelebration({
  moduleName,
  nextModuleName,
  onContinue,
  isRookieCourse,
}: ModuleCompletionCelebrationProps) {
  const [showContent, setShowContent] = useState(false);
  const [stars, setStars] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    // Generate random stars
    const newStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      size: Math.random() * 3 + 1,
    }));
    setStars(newStars);

    // Trigger content animation
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center overflow-hidden">
      {/* Starry background */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: isRookieCourse 
                ? `rgba(34, 197, 94, ${0.3 + Math.random() * 0.5})` 
                : `rgba(59, 130, 246, ${0.3 + Math.random() * 0.5})`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Radial glow */}
      <div className={cn(
        "absolute inset-0 opacity-30",
        isRookieCourse
          ? "bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.3)_0%,transparent_70%)]"
          : "bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.3)_0%,transparent_70%)]"
      )} />

      {/* Content */}
      <div className={cn(
        "relative z-10 text-center px-6 max-w-md transition-all duration-700",
        showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Module Complete */}

        {/* Module Complete */}
        <h1 className="text-3xl font-black text-foreground mb-2">
          {moduleName}
        </h1>


        {/* Next module preview */}
        {nextModuleName && (
          <p className="text-sm text-muted-foreground mb-4">
            Next up: <span className="text-foreground font-medium">{nextModuleName}</span>
          </p>
        )}

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          size="lg"
          className={cn(
            "font-bold gap-2 transition-all duration-300 hover:translate-y-[-2px]",
            isRookieCourse
              ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)]"
              : "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)]"
          )}
        >
          Continue Training
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
