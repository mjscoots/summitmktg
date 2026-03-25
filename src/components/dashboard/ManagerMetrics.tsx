import { useNavigate } from 'react-router-dom';
import { Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ManagerMetricsProps {
  streak: number;
  momentum: number;
  lastTrainedAgo?: string;
}

export function ManagerMetrics({ streak, momentum, lastTrainedAgo }: ManagerMetricsProps) {
  const navigate = useNavigate();

  const getMomentumColor = (pct: number) => {
    if (pct >= 71) return 'text-success';
    if (pct >= 41) return 'text-primary';
    return 'text-destructive';
  };

  const getMomentumBg = (pct: number) => {
    if (pct >= 71) return 'bg-success/10 border-success/30';
    if (pct >= 41) return 'bg-primary/10 border-primary/30';
    return 'bg-destructive/10 border-destructive/30';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Streak Counter */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/app/training')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "bg-primary/10 border border-primary/30",
              "hover:bg-primary/20 transition-all duration-200",
              "hover:scale-105"
            )}
          >
            <Flame className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-bold text-primary">
              Day {streak}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="text-xs">
            <p className="font-semibold mb-1">{streak}-Day Streak</p>
            {lastTrainedAgo && (
              <p className="text-muted-foreground">Last trained: {lastTrainedAgo}</p>
            )}
            <p className="text-primary mt-1">Click to continue training →</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Momentum Meter */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
              getMomentumBg(momentum)
            )}
          >
            <Zap className={cn("w-4 h-4", getMomentumColor(momentum))} />
            <span className={cn("text-sm font-bold", getMomentumColor(momentum))}>
              {momentum}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="text-xs">
            <p className="font-semibold mb-2">⚡ Momentum: {momentum}%</p>
            <div className="space-y-1 text-muted-foreground">
              <p>Weekly engagement score based on:</p>
              <ul className="list-disc list-inside ml-1">
                <li>Daily logins</li>
                <li>Time on platform</li>
                <li>Team interactions</li>
              </ul>
            </div>
            {momentum >= 71 && (
              <p className="text-success mt-2">✅ Great engagement!</p>
            )}
            {momentum >= 41 && momentum < 71 && (
              <p className="text-primary mt-2">⚡ Building momentum</p>
            )}
            {momentum < 41 && (
              <p className="text-destructive mt-2">⚠️ Needs more activity</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
