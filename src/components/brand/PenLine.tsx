import { memo, useEffect, useRef, useState } from 'react';

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

const LINE = 'Where being a sales rep is not the end goal.';

export interface PenLineProps {
  className?: string;
  /** The write only starts once this is true. */
  start?: boolean;
}

function PenLineBase({ className, start = true }: PenLineProps) {
  const textRef = useRef<SVGTextElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number; x: number; y: number } | null>(null);

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
  }, []);

  const pad = 6;
  const vb = box ? `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}` : '0 0 600 80';

  return (
    <p className={className}>
      <span className="sr-only">{LINE}</span>
      <svg
        className="pen-line"
        aria-hidden="true"
        data-writing={start && box ? 'true' : 'false'}
        viewBox={vb}
        width="100%"
        style={box ? { maxWidth: `${Math.round(box.w + pad * 2)}px` } : { visibility: 'hidden' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="pen-line-clip" clipPathUnits="userSpaceOnUse">
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
          {LINE}
        </text>
        <g clipPath="url(#pen-line-clip)">
          <text className="pen-line-text pen-line-ink" x="0" y="0" dominantBaseline="hanging">
            {LINE}
          </text>
        </g>
      </svg>
    </p>
  );
}

export const PenLine = memo(PenLineBase);
export default PenLine;
