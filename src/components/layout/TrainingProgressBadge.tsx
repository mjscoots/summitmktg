import { useNavigate } from 'react-router-dom';
import { TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { usePersonalTrainingProgress } from '@/hooks/usePersonalTrainingProgress';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrainingProgressBadgeProps {
  variant?: 'compact' | 'full';
}

export function TrainingProgressBadge({ variant = 'compact' }: TrainingProgressBadgeProps) {
  const navigate = useNavigate();
  const { progress, isLoading, getProgressColor, getProgressBgColor } = usePersonalTrainingProgress();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  const progressColor = getProgressColor(progress.overall);
  const bgColor = getProgressBgColor(progress.overall);

  if (variant === 'full') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => navigate('/app/training')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105",
                bgColor
              )}
            >
              <TrendingUp className={cn("w-4 h-4", progressColor)} />
              <div className="text-sm">
                <span className={cn("font-bold text-lg", progressColor)}>
                  {progress.overall}%
                </span>
                <span className="text-muted-foreground ml-1.5">Training</span>
              </div>
              {progress.isComplete && (
                <CheckCircle className="w-4 h-4 text-primary ml-1" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-4">
            <ProgressTooltipContent progress={progress} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant (for status bar)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => navigate('/app/training')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 border",
              bgColor
            )}
          >
            <TrendingUp className={cn("w-3.5 h-3.5", progressColor)} />
            <span className={progressColor}>{progress.overall}%</span>
            {progress.isComplete && (
              <CheckCircle className="w-3 h-3 text-primary" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-4">
          <ProgressTooltipContent progress={progress} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  percentage: number;
  completedLessons: number;
  totalLessons: number;
}

function ProgressTooltipContent({ progress }: { progress: { overall: number; courses: CourseProgress[]; isComplete: boolean } }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="font-semibold">Your Training Progress: {progress.overall}%</span>
      </div>

      <div className="space-y-2">
        {progress.courses.map(course => (
          <div key={course.courseId} className="flex items-center gap-2 text-sm">
            {course.percentage === 100 ? (
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(
              course.percentage === 100 ? "text-primary" : "text-muted-foreground"
            )}>
              {course.courseTitle}: {course.percentage}% ({course.completedLessons}/{course.totalLessons})
            </span>
          </div>
        ))}
      </div>

      {!progress.isComplete && (
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Click to continue training →
        </p>
      )}
    </div>
  );
}
