import { useNavigate } from 'react-router-dom';
import { Zap, Clock, MessageSquare, BookOpen, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextRankPushProps {
  pointsToNext: number;
  rivalName: string;
  currentRank: number;
}

interface PushAction {
  icon: React.ReactNode;
  label: string;
  points: number;
}

export function NextRankPush({ pointsToNext, rivalName, currentRank }: NextRankPushProps) {
  const navigate = useNavigate();

  if (pointsToNext <= 0) return null;

  // Calculate ways to earn the gap
  const actions: PushAction[] = [];
  const hoursNeeded = Math.ceil(pointsToNext / 120 * 10) / 10;
  if (hoursNeeded <= 5) {
    actions.push({ icon: <Clock className="w-3.5 h-3.5 text-primary" />, label: `${hoursNeeded}h training`, points: Math.round(hoursNeeded * 120) });
  }
  const msgsNeeded = Math.ceil(pointsToNext / 15);
  if (msgsNeeded <= 30) {
    actions.push({ icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />, label: `${msgsNeeded} chat messages`, points: msgsNeeded * 15 });
  }
  const lessonsNeeded = Math.ceil(pointsToNext / 60);
  if (lessonsNeeded <= 5) {
    actions.push({ icon: <BookOpen className="w-3.5 h-3.5 text-primary" />, label: `${lessonsNeeded} lessons`, points: lessonsNeeded * 60 });
  }

  return (
    <div className="mx-4 mt-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUp className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Next Rank Push</h3>
      </div>

      <p className="text-sm text-foreground mb-3">
        You are <span className="font-black text-primary">{pointsToNext} pts</span> away from Rank #{currentRank - 1}
        {rivalName && <span className="text-muted-foreground"> ({rivalName})</span>}
      </p>

      {actions.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Ways to earn it:</p>
          <div className="space-y-1">
            {actions.slice(0, 3).map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {action.icon}
                <span className="text-muted-foreground">{action.label}</span>
                <span className="text-primary font-bold ml-auto tabular-nums">+{action.points} pts</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
