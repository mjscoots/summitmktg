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

  useEffect(() => {
    // Trigger content animation
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      {/* Content */}
      <div className={cn(
        "relative z-10 text-center px-6 max-w-md transition-all duration-700",
        showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Module Complete Badge */}
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm font-semibold",
          isRookieCourse 
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-primary/20 text-primary border border-primary/30"
        )}>
          <Star className={cn("w-4 h-4", isRookieCourse ? "text-primary" : "text-primary")} />
          Module Complete
        </div>

        {/* Module Name */}
        <h1 className="text-3xl font-black text-foreground mb-3 tracking-tight">
          {moduleName}
        </h1>

        {/* Next module preview */}
        {nextModuleName && (
          <p className="text-sm text-muted-foreground mb-6">
            Next up: <span className={cn("font-semibold", isRookieCourse ? "text-primary" : "text-primary")}>{nextModuleName}</span>
          </p>
        )}

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          size="lg"
          className={cn(
            "font-bold gap-2 transition-all duration-300 hover:translate-y-[-2px]",
            isRookieCourse
              ? "bg-primary hover:bg-primary text-white shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)]"
              : "bg-primary hover:bg-primary text-white"
          )}
        >
          Continue Training
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
