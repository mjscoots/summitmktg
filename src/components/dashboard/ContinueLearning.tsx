import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain, FileText, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdown } from '@/hooks/useMyPoints';

interface ContinueLearningProps {
  data: PointsBreakdown;
  isComplete: boolean;
}

interface LearningAction {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  points: string;
  route: string;
  priority: number;
  iconColor: string;
}

export function ContinueLearning({ data, isComplete }: ContinueLearningProps) {
  const navigate = useNavigate();

  if (isComplete) return null;

  // Build prioritized actions based on remaining caps
  const actions: LearningAction[] = [];

  const hoursRemaining = data.capsToday.hours.max - data.capsToday.hours.earned;
  const lessonRemaining = data.capsToday.lesson.max - data.capsToday.lesson.earned;
  const videoRemaining = data.capsToday.video.max - data.capsToday.video.earned;
  const manualRemaining = data.capsToday.manual.max - data.capsToday.manual.earned;

  if (lessonRemaining > 0) {
    actions.push({
      icon: <BookOpen className="w-4 h-4" />,
      label: 'Resume Lesson',
      subtitle: '',
      points: `+${Math.min(60, lessonRemaining)} pts`,
      route: '/app/training',
      priority: hoursRemaining > 0 ? 1 : 2,
      iconColor: 'text-green-400',
    });
  }

  if (lessonRemaining >= 20) {
    actions.push({
      icon: <Brain className="w-4 h-4" />,
      label: 'Take Next Quiz',
      subtitle: '',
      points: '+75 pts possible',
      route: '/app/training',
      priority: 3,
      iconColor: 'text-purple-400',
    });
  }

  if (manualRemaining > 0) {
    actions.push({
      icon: <FileText className="w-4 h-4" />,
      label: 'Sales Manual',
      subtitle: '',
      points: `+${Math.min(50, manualRemaining)} pts`,
      route: '/app/training',
      priority: 4,
      iconColor: 'text-amber-400',
    });
  }

  if (videoRemaining > 0) {
    actions.push({
      icon: <Play className="w-4 h-4" />,
      label: 'Training Video',
      subtitle: '',
      points: `+${Math.min(40, videoRemaining)} pts`,
      route: '/app/training/videos',
      priority: 5,
      iconColor: 'text-blue-400',
    });
  }

  // Sort by priority and limit to 4
  const sorted = actions.sort((a, b) => a.priority - b.priority).slice(0, 4);

  if (sorted.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-green-400" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Continue Learning</h2>
      </div>

      <div className="space-y-2">
        {sorted.map((action, idx) => (
          <button
            key={idx}
            onClick={() => navigate(action.route)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg",
              "bg-muted/20 border border-border/30",
              "hover:border-primary/30 hover:bg-primary/5",
              "transition-all duration-200 group text-left"
            )}
          >
            <div className={cn("p-2 rounded-lg bg-muted/50", action.iconColor)}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {action.label}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-bold text-primary">{action.points}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
