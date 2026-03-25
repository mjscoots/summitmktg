import { Target, Clock, MessageSquare, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdown } from '@/hooks/useMyPoints';

interface NextPointOpportunityProps {
  data: PointsBreakdown;
}

interface Opportunity {
  icon: React.ReactNode;
  label: string;
  points: number;
}

export function NextPointOpportunity({ data }: NextPointOpportunityProps) {
  const opportunities: Opportunity[] = [];

  const hoursRemaining = data.capsToday.hours.max - data.capsToday.hours.earned;
  const chatRemaining = data.capsToday.chat.max - data.capsToday.chat.earned;
  const lessonRemaining = data.capsToday.lesson.max - data.capsToday.lesson.earned;
  const manualRemaining = data.capsToday.manual.max - data.capsToday.manual.earned;

  if (hoursRemaining > 0) {
    opportunities.push({
      icon: <Clock className="w-3.5 h-3.5 text-primary" />,
      label: 'Train for 1 hour',
      points: Math.min(120, hoursRemaining),
    });
  }

  if (chatRemaining > 0) {
    opportunities.push({
      icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
      label: 'Remaining chat points today',
      points: chatRemaining,
    });
  }

  if (lessonRemaining > 0) {
    opportunities.push({
      icon: <BookOpen className="w-3.5 h-3.5 text-primary" />,
      label: 'Complete next lesson',
      points: Math.min(60, lessonRemaining),
    });
  }

  if (manualRemaining > 0) {
    opportunities.push({
      icon: <FileText className="w-3.5 h-3.5 text-primary" />,
      label: 'Manual review (15 min)',
      points: Math.min(50, manualRemaining),
    });
  }

  if (opportunities.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Next Points Available</h2>
      </div>

      <div className="space-y-1.5">
        {opportunities.map((opp, idx) => (
          <div key={idx} className="flex items-center gap-2.5 py-1.5">
            {opp.icon}
            <span className="text-xs text-muted-foreground flex-1">{opp.label}</span>
            <span className="text-xs font-bold text-primary tabular-nums">+{opp.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
