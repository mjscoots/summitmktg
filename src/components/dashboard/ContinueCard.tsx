import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ContinueCardProps {
  nextLessonTitle?: string;
  nextLessonDuration?: string;
  courseName?: string;
  courseSlug?: string;
  lessonId?: string;
  progress?: number;
}

export function ContinueCard({
  nextLessonTitle = "Universal Door Intro",
  nextLessonDuration = "3 min",
  courseName = "Learn Your Pitch",
  courseSlug = "learn-your-pitch",
  lessonId,
  progress = 0
}: ContinueCardProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const handleContinue = () => {
    if (lessonId) {
      navigate(`/app/training/${courseSlug}/${lessonId}`);
    } else {
      navigate(`/app/training/${courseSlug}`);
    }
  };

  return (
    <div className={cn(
      "relative p-6 rounded-xl border-2 bg-card overflow-hidden transition-all duration-300 hover:scale-[1.01]",
      isManager 
        ? "border-blue-500/40 shadow-[0_0_30px_-5px_rgba(59,130,246,0.25)]" 
        : "border-green-500/40 shadow-[0_0_30px_-5px_rgba(34,197,94,0.25)]"
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn(
        "absolute inset-0 opacity-10",
        isManager 
          ? "bg-gradient-to-br from-blue-500 to-transparent" 
          : "bg-gradient-to-br from-green-500 to-transparent"
      )} />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            "text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider",
            isManager 
              ? "bg-blue-500/15 text-blue-400" 
              : "bg-primary/15 text-primary"
          )}>
            Continue Where You Left Off
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm mb-1">{courseName}</p>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Next up: {nextLessonTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              Estimated time: {nextLessonDuration}
            </p>
          </div>

          <Button
            onClick={handleContinue}
            size="lg"
            className={cn(
              "font-bold gap-2",
              isManager 
                ? "bg-blue-500 hover:bg-blue-600" 
                : "bg-primary hover:bg-primary"
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Course Progress</span>
            <span className={cn(
              "font-bold",
              isManager ? "text-blue-400" : "text-primary"
            )}>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isManager ? "bg-blue-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
