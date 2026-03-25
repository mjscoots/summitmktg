import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw, Zap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

interface QuizResultsDisplayProps {
  passed: boolean;
  score: number;
  correct: number;
  total: number;
  results: QuestionResult[];
  isRookieCourse: boolean;
  isLastLesson: boolean;
  onNext: () => void;
  onRetake: () => void;
  onReviewMaterial: () => void;
}

function XPBadge({ points, delay = 0 }: { points: number; delay?: number }) {
  const [show, setShow] = useState(false);
  const [displayPts, setDisplayPts] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!show) return;
    const steps = 12;
    const inc = points / steps;
    let cur = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      cur += inc;
      setDisplayPts(Math.round(cur));
      if (step >= steps) { clearInterval(timer); setDisplayPts(points); }
    }, 35);
    return () => clearInterval(timer);
  }, [show, points]);

  if (!show) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-green-500/30 text-sm font-bold animate-scale-in">
      <Zap className="w-4 h-4" />
      +{displayPts} XP
    </div>
  );
}

export function QuizResultsDisplay({
  passed,
  score,
  correct,
  total,
  results,
  isRookieCourse,
  isLastLesson,
  onNext,
  onRetake,
  onReviewMaterial,
}: QuizResultsDisplayProps) {
  if (passed) {
    return (
      <div className="p-6 rounded-lg text-center bg-primary/10 border border-green-500/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-scale-in">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-xl font-bold text-primary mb-2">
          Perfect Score
        </h3>
        
        <p className="text-lg text-foreground mb-3">
          You scored <span className="font-bold text-primary">100%</span> ({correct}/{total} correct)
        </p>

        {/* XP reward with delayed entrance */}
        <div className="flex justify-center mb-4">
          <XPBadge points={total * 25} delay={400} />
        </div>
        
        {/* Show all correct answers */}
        <div className="bg-card/50 rounded-lg p-4 mb-6 text-left max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <div key={result.question_id} className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">Question {index + 1}: Correct</p>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Your manager has been notified of your success.
        </p>
        
        <Button 
          onClick={onNext}
          className={cn(
            "font-semibold h-11 px-6 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg",
            isRookieCourse 
              ? "bg-primary hover:bg-primary" 
              : "bg-blue-500 hover:bg-blue-600"
          )}
        >
          {isLastLesson ? 'Complete Course' : 'Continue to Next Section'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Failed quiz - show detailed feedback
  return (
    <div className="p-6 rounded-lg bg-primary/10 border border-amber-500/20">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-xl font-bold text-primary mb-2 text-center">
        Not Quite There Yet
      </h3>
      
      <p className="text-lg text-foreground mb-2 text-center">
        You scored <span className="font-bold text-primary">{score}%</span> ({correct}/{total} correct)
      </p>
      
      <p className="text-sm text-primary mb-4 text-center font-medium">
        You must score 100% to proceed
      </p>
      
      {/* Detailed results */}
      <div className="bg-card/50 rounded-lg p-4 mb-6 max-h-80 overflow-y-auto">
        {results.map((result, index) => (
          <div 
            key={result.question_id} 
            className={cn(
              "py-3 border-b border-border/30 last:border-0",
              !result.is_correct && "bg-destructive/5 -mx-4 px-4 rounded-lg"
            )}
          >
            <div className="flex items-start gap-2">
              {result.is_correct ? (
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">
                  Question {index + 1}: {result.is_correct ? 'Correct' : 'Incorrect'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {result.question_text}
                </p>
                
                {!result.is_correct && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs">
                      <span className="text-destructive font-medium">Your answer:</span>{' '}
                      <span className="text-muted-foreground">{result.user_answer || '(no answer)'}</span>
                    </p>
                    <p className="text-xs">
                      <span className="text-primary font-medium">Correct answer:</span>{' '}
                      <span className="text-foreground">{result.correct_answer}</span>
                    </p>
                    {result.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {result.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          variant="outline"
          onClick={onReviewMaterial}
          className="gap-2"
        >
          Review Material
        </Button>
        <Button 
          onClick={onRetake}
          className={cn(
            "font-semibold gap-2",
            isRookieCourse 
              ? "bg-primary hover:bg-primary" 
              : "bg-blue-500 hover:bg-blue-600"
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Retake Quiz
        </Button>
      </div>
    </div>
  );
}
