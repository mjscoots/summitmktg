import { cn } from '@/lib/utils';

interface RidgelineMarkProps {
  className?: string;
  size?: number;
  loop?: boolean;
  animate?: boolean;
}

/** The continuous TRNTY ridgeline, with an optional draw-and-glow signature. */
export function RidgelineMark({ className, size = 48, loop = false, animate = true }: RidgelineMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Trinity Sales"
      className={cn('ridgeline-mark', animate && 'ridgeline-mark-draw', loop && 'ridgeline-mark-loop', className)}
    >
      <path
        d="M4 48 L17 30 L24 39 L32 15 L41 39 L48 30 L60 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default RidgelineMark;