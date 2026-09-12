import { memo, useEffect, useId, useRef, useState } from 'react';

/**
 * Pass 184 - the handwritten line under the headline.
 *
 * The line is drawn as SVG text in Caveat, measured on mount so the viewBox is
 * exactly the glyph box, and written left to right over 1,800ms by a clip that
 * opens across it, so each glyph takes its fill as the pen reaches it. The real
 * sentence stays in the DOM for screen readers and for copy and paste, and the
 * drawn copy is hidden from the accessibility tree.
 *
 * Under prefers-reduced-motion the clip is open from the first frame, so the
 * line simply renders.
 */

export interface PenLineProps {
  className?: string;
  /** The write only starts once this is true. */
  start?: boolean;
  lines?: readonly string[];
  duration?: number;
  delay?: number;
}

interface DrawnLineProps {
  line: string;
  start: boolean;
  duration: number;
  delay: number;
}

function DrawnLine({ line, start, duration, delay }: DrawnLineProps) {
  const textRef = useRef<SVGTextElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number; x: number; y: number } | null>(null);
  const clipId = `pen-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    let frame = 0;
    let live = true;
    const measure = () => {
      if (!live) return;
      try {
        const b = node.getBBox();
        if (b.width > 0) setBox({ w: b.width, h: b.height, x: b.x, y: b.y });
        else frame = requestAnimationFrame(measure);
      } catch {
        /* not laid out yet */
      }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [line]);

  const pad = 6;
  const vb = box ? `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}` : '0 0 600 80';

  const style = box
    ? {
        maxWidth: `${Math.round(box.w + pad * 2)}px`,
        '--pen-duration': `${duration}ms`,
        '--pen-delay': `${delay}ms`,
      } as React.CSSProperties
    : { visibility: 'hidden' as const };

  return (
    <svg
      className="pen-line"
      aria-hidden="true"
      data-writing={start && box ? 'true' : 'false'}
      viewBox={vb}
      width="100%"
      style={style}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect
            className="pen-line-wipe"
            x={box ? box.x - pad : 0}
            y={box ? box.y - pad : 0}
            width={box ? box.w + pad * 2 : 600}
            height={box ? box.h + pad * 2 : 80}
          />
        </clipPath>
      </defs>
      <text ref={textRef} className="pen-line-text pen-line-ghost" x="0" y="0" dominantBaseline="hanging">
        {line}
      </text>
      <g clipPath={`url(#${clipId})`}>
        <text className="pen-line-text pen-line-ink" x="0" y="0" dominantBaseline="hanging">
          {line}
        </text>
      </g>
    </svg>
  );
}

function PenLineBase({
  className,
  start = true,
  lines = ['Where being a sales rep is not the end goal.'],
  duration = 1800,
  delay = 0,
}: PenLineProps) {
  const perLine = duration / Math.max(1, lines.length);
  return (
    <p className={className}>
      <span className="sr-only">{lines.join(' ')}</span>
      <span className="pen-lines" aria-hidden="true">
        {lines.map((line, index) => (
          <DrawnLine
            key={`${index}-${line}`}
            line={line}
            start={start}
            duration={perLine}
            delay={delay + perLine * index}
          />
        ))}
      </span>
    </p>
  );
}

export const PenLine = memo(PenLineBase);
export default PenLine;
