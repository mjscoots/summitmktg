import { LucideIcon, Lock, CheckCircle2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterviewCardProps {
  number: number;
  title: string;
  color: 'yellow' | 'orange' | 'red';
  purpose: string;
  dopamineGoal: string;
  icon: LucideIcon;
  isLocked: boolean;
  isComplete: boolean;
  onClick: () => void;
}

const colorMap = {
  yellow: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
    button: 'bg-yellow-500 hover:bg-yellow-600',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    button: 'bg-orange-500 hover:bg-orange-600',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    button: 'bg-red-500 hover:bg-red-600',
  },
};

export function InterviewCard({
  number,
  title,
  color,
  purpose,
  dopamineGoal,
  icon: Icon,
  isLocked,
  isComplete,
  onClick,
}: InterviewCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'relative flex flex-col h-[320px] rounded-xl border p-5 transition-all duration-300',
        isLocked
          ? 'bg-muted/30 border-border opacity-60'
          : cn(colors.bg, colors.border, 'hover:shadow-lg', colors.glow)
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl',
          isLocked ? 'bg-muted' : colors.bg
        )}>
          {isLocked ? (
            <Lock className="w-5 h-5 text-muted-foreground" />
          ) : isComplete ? (
            <CheckCircle2 className={cn('w-6 h-6', colors.text)} />
          ) : (
            <Icon className={cn('w-6 h-6', colors.text)} />
          )}
        </div>
        <span className={cn(
          'text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider',
          isLocked ? 'bg-muted text-muted-foreground' : cn(colors.bg, colors.text)
        )}>
          Interview {number}
        </span>
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-lg font-bold mb-2',
        isLocked ? 'text-muted-foreground' : 'text-foreground'
      )}>
        {title}
      </h3>

      {/* Purpose */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Purpose</p>
        <p className={cn(
          'text-sm',
          isLocked ? 'text-muted-foreground' : 'text-foreground/80'
        )}>
          {purpose}
        </p>
      </div>

      {/* Dopamine Goal */}
      <div className="mb-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Dopamine Goal</p>
        <p className={cn(
          'text-sm italic',
          isLocked ? 'text-muted-foreground' : colors.text
        )}>
          {dopamineGoal}
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={onClick}
        disabled={isLocked}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all duration-200',
          isLocked
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : cn(colors.button, 'text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5')
        )}
      >
        {isLocked ? (
          <>
            <Lock className="w-4 h-4" />
            <span>Complete Previous First</span>
          </>
        ) : isComplete ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Review Interview {number}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>Start Interview {number}</span>
          </>
        )}
      </button>
    </div>
  );
}
