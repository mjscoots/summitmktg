import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
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
  const accentColor = isRookieCourse ? 'green' : 'blue';

  if (passed) {
    return (
      <div className="p-6 rounded-lg text-center bg-green-500/10 border border-green-500/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        
        <h3 className="text-xl font-bold text-green-400 mb-2">
          🎉 Congratulations!
        </h3>
        
        <p className="text-lg text-foreground mb-4">
          You scored <span className="font-bold text-green-400">100%</span> ({correct}/{total} correct)
        </p>
        
        {/* Show all correct answers */}
        <div className="bg-card/50 rounded-lg p-4 mb-6 text-left max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <div key={result.question_id} className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">Question {index + 1}: Correct</p>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Your manager has been notified of your success!
        </p>
        
        <Button 
          onClick={onNext}
          className={cn(
            "font-semibold h-11 px-6",
            isRookieCourse 
              ? "bg-green-500 hover:bg-green-600" 
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
    <div className="p-6 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>
      
      <h3 className="text-xl font-bold text-amber-400 mb-2 text-center">
        📚 Not Quite There Yet
      </h3>
      
      <p className="text-lg text-foreground mb-2 text-center">
        You scored <span className="font-bold text-amber-400">{score}%</span> ({correct}/{total} correct)
      </p>
      
      <p className="text-sm text-amber-400 mb-4 text-center font-medium">
        ⚠️ You must score 100% to proceed
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
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
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
                      <span className="text-green-400 font-medium">Correct answer:</span>{' '}
                      <span className="text-foreground">{result.correct_answer}</span>
                    </p>
                    {result.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        💡 {result.explanation}
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
              ? "bg-green-500 hover:bg-green-600" 
              : "bg-blue-500 hover:bg-blue-600"
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Retake Quiz Immediately
        </Button>
      </div>
    </div>
  );
}
