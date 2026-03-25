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
  points: string;
  route: string;
  priority: number;
  iconColor: string;
}

export function ContinueLearning({ data, isComplete }: ContinueLearningProps) {
  const navigate = useNavigate();

  if (isComplete) return null;

  const actions: LearningAction[] = [];
  const hoursRemaining = data.capsToday.hours.max - data.capsToday.hours.earned;
  const lessonRemaining = data.capsToday.lesson.max - data.capsToday.lesson.earned;
  const videoRemaining = data.capsToday.video.max - data.capsToday.video.earned;
  const manualRemaining = data.capsToday.manual.max - data.capsToday.manual.earned;

  if (lessonRemaining > 0) {
    actions.push({ icon: <BookOpen className="w-4 h-4" />, label: 'Resume Lesson', points: `+${Math.min(60, lessonRemaining)}`, route: '/app/training', priority: hoursRemaining > 0 ? 1 : 2, iconColor: 'text-primary' });
  }
  if (lessonRemaining >= 20) {
    actions.push({ icon: <Brain className="w-4 h-4" />, label: 'Take Quiz', points: '+75', route: '/app/training', priority: 3, iconColor: 'text-primary' });
  }
  if (manualRemaining > 0) {
    actions.push({ icon: <FileText className="w-4 h-4" />, label: 'Sales Manual', points: `+${Math.min(50, manualRemaining)}`, route: '/app/training', priority: 4, iconColor: 'text-primary' });
  }
  if (videoRemaining > 0) {
    actions.push({ icon: <Play className="w-4 h-4" />, label: 'Watch Video', points: `+${Math.min(40, videoRemaining)}`, route: '/app/training/videos', priority: 5, iconColor: 'text-blue-400' });
  }

  const sorted = actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
  if (sorted.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Continue Learning</h2>
      </div>

      <div className="space-y-1">
        {sorted.map((action, idx) => (
          <button
            key={idx}
            onClick={() => navigate(action.route)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-all group text-left"
          >
            <div className={cn("flex-shrink-0", action.iconColor)}>
              {action.icon}
            </div>
            <span className="text-sm text-foreground flex-1">{action.label}</span>
            <span className="text-xs font-medium text-primary">{action.points} pts</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
