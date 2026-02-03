import { cn } from '@/lib/utils';

interface AnimatedEllipsisProps {
  className?: string;
}

export function AnimatedEllipsis({ className }: AnimatedEllipsisProps) {
  return (
    <span className={cn("inline-flex", className)}>
      <span className="animate-[pulse_1.4s_ease-in-out_infinite]">.</span>
      <span className="animate-[pulse_1.4s_ease-in-out_0.2s_infinite]">.</span>
      <span className="animate-[pulse_1.4s_ease-in-out_0.4s_infinite]">.</span>
    </span>
  );
}