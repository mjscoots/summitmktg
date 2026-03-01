import { Mountain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummitLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function SummitLoader({ size = 'md', label, className }: SummitLoaderProps) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12", className)}>
      <div className="animate-bounce">
        <Mountain className={cn(iconSize, "text-primary")} />
      </div>
      {label && (
        <p className={cn(textSize, "text-muted-foreground font-medium animate-pulse")}>{label}</p>
      )}
    </div>
  );
}
