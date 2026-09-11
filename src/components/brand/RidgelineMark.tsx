import { cn } from '@/lib/utils';
import { MARK_PATH } from './Wordmark';

interface RidgelineMarkProps {
  className?: string;
  size?: number;
  loop?: boolean;
  animate?: boolean;
}

/**
 * Pass 180 - the solid three peak silhouette in ember. The signature keeps the
 * draw-and-glow behaviour: the outline strokes on, the fill rises behind it.
 */
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
        d={MARK_PATH}
        className="ridgeline-mark-fill"
        fill="var(--wordmark-accent, #F2673A)"
        stroke="var(--wordmark-accent, #F2673A)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default RidgelineMark;
