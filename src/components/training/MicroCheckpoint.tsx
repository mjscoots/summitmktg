import { useState } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MicroCheckpointProps {
  question: string;
  options?: string[];
  onComplete: () => void;
  isRookieCourse: boolean;
}

export function MicroCheckpoint({
  question,
  options,
  onComplete,
  isRookieCourse,
}: MicroCheckpointProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    setIsCompleted(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const handleGotIt = () => {
    setIsCompleted(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  if (isCompleted) {
    return (
      <div className={cn(
        "p-6 rounded-xl border-2 transition-all duration-500",
        isRookieCourse 
          ? "border-green-500/50 bg-primary/10"
          : "border-blue-500/50 bg-blue-500/10"
      )}>
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className={cn(
            "w-6 h-6 animate-scale-in",
            isRookieCourse ? "text-primary" : "text-blue-400"
          )} />
          <span className="font-semibold text-foreground">Got it!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-6 rounded-xl border-2 transition-all duration-300",
      isRookieCourse 
        ? "border-green-500/30 bg-primary/5"
        : "border-blue-500/30 bg-blue-500/5"
    )}>
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          isRookieCourse ? "bg-primary/20" : "bg-blue-500/20"
        )}>
          <Lightbulb className={cn(
            "w-5 h-5",
            isRookieCourse ? "text-primary" : "text-blue-400"
          )} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-1">
            Quick Check
          </h4>
          <p className="text-foreground">{question}</p>
        </div>
      </div>

      {options && options.length > 0 ? (
        <div className="space-y-2 mb-4">
          {options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all duration-200",
                selectedOption === option
                  ? isRookieCourse
                    ? "border-green-500 bg-primary/20 text-foreground"
                    : "border-blue-500 bg-blue-500/20 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      <Button
        onClick={options?.length ? handleConfirm : handleGotIt}
        disabled={options?.length ? !selectedOption : false}
        className={cn(
          "w-full font-semibold transition-all duration-300",
          isRookieCourse
            ? "bg-primary hover:bg-primary text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        {options?.length ? 'Confirm' : 'Got it'}
      </Button>
    </div>
  );
}
