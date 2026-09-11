import { useId } from 'react';
import { cn } from '@/lib/utils';
import { MARK_PATH } from './Wordmark';

interface RidgelineMarkProps {
  className?: string;
  size?: number;
  loop?: boolean;
  animate?: boolean;
}

/**
 * Pass 181 - the peak. A single isosceles triangle filled with the blue to
 * violet gradient. The signature keeps its behaviour: the two sides draw from
 * the base to the apex over 900ms, then the gradient fill rises behind them.
 */
export function RidgelineMark({ className, size = 48, loop = false, animate = true }: RidgelineMarkProps) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Trinity Sales"
      className={cn('ridgeline-mark', animate && 'ridgeline-mark-draw', loop && 'ridgeline-mark-loop', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3A8DFF" />
          <stop offset="0.52" stopColor="#7C6BFF" />
          <stop offset="1" stopColor="#B69CFF" />
        </linearGradient>
      </defs>
      <path d={MARK_PATH} className="ridgeline-mark-fill" fill={`url(#${gradientId})`} />
      <path
        d="M0 64 L32 11.52 L64 64"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default RidgelineMark;
