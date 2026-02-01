import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LessonNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  isRookieCourse: boolean;
  isLastLesson?: boolean;
}

export function LessonNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  canProceed,
  isRookieCourse,
  isLastLesson = false,
}: LessonNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i < currentStep
                      ? isRookieCourse ? "bg-green-500" : "bg-blue-500"
                      : i === currentStep
                        ? isRookieCourse ? "bg-green-400 ring-2 ring-green-400/30" : "bg-blue-400 ring-2 ring-blue-400/30"
                        : "bg-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {/* Next Button */}
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className={cn(
              "gap-2 font-bold transition-all duration-300",
              canProceed && (
                isRookieCourse
                  ? "bg-green-500 hover:bg-green-600 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.7)]"
                  : "bg-blue-500 hover:bg-blue-600 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7)]"
              )
            )}
          >
            {isLastLesson ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
