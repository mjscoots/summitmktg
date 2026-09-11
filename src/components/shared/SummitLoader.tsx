import { cn } from '@/lib/utils';
import { RidgelineMark } from '@/components/brand/RidgelineMark';

interface SummitLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function SummitLoader({ size = 'md', label, className }: SummitLoaderProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 48 : 34;
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12", className)}>
      <RidgelineMark size={iconSize} loop className="text-primary" />
      {label && (
        <p className={cn(textSize, "text-muted-foreground font-medium")}>{label}</p>
      )}
    </div>
  );
}
