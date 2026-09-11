import { cn } from '@/lib/utils';
import { LOGO_BLUE, MOUNTAIN_PATH, MOUNTAIN_VIEWBOX } from './logoPaths';

interface RidgelineMarkProps {
  className?: string;
  size?: number;
  loop?: boolean;
  animate?: boolean;
}

/**
 * Pass 183 - the mountain from the real logo, alone.
 *
 * The signature keeps its behaviour and its props: the outline draws as a 2px
 * stroke from left to right over 900ms, then the fill rises behind it. Under
 * prefers-reduced-motion the filled mountain is there from the first frame.
 */
export function RidgelineMark({ className, size = 48, loop = false, animate = true }: RidgelineMarkProps) {
  return (
    <svg
      viewBox={MOUNTAIN_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label="Trinity Sales"
      className={cn('ridgeline-mark', animate && 'ridgeline-mark-draw', loop && 'ridgeline-mark-loop', className)}
    >
      <path
        d={MOUNTAIN_PATH}
        fillRule="evenodd"
        fill={LOGO_BLUE}
        stroke={LOGO_BLUE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default RidgelineMark;
