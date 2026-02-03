import { cn } from '@/lib/utils';

interface TrainingProgressBadgeProps {
  percentage: number;
  showBar?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrainingProgressBadge({ 
  percentage, 
  showBar = false, 
  size = 'sm',
  className 
}: TrainingProgressBadgeProps) {
  const getColor = () => {
    if (percentage === 100) return { text: 'text-success', bg: 'bg-success', bgLight: 'bg-success/15' };
    if (percentage >= 67) return { text: 'text-primary', bg: 'bg-primary', bgLight: 'bg-primary/15' };
    if (percentage >= 34) return { text: 'text-yellow-500', bg: 'bg-yellow-500', bgLight: 'bg-yellow-500/15' };
    return { text: 'text-destructive', bg: 'bg-destructive', bgLight: 'bg-destructive/15' };
  };

  const colors = getColor();

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className={cn(
        "font-medium tabular-nums",
        colors.text,
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {percentage}%
      </span>
      {showBar && (
        <div className={cn(
          "rounded-full overflow-hidden",
          colors.bgLight,
          size === 'sm' ? 'h-1 w-12' : 'h-1.5 w-16'
        )}>
          <div 
            className={cn("h-full rounded-full transition-all duration-300", colors.bg)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
