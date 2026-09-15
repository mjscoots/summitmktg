import { memo } from 'react';

/**
 * Selectable handwritten text revealed by a soft mask. The parent supplies one
 * progress variable per line so every line can share the same animation frame.
 */

export interface PenLineProps {
  className?: string;
  lines?: readonly string[];
  progressVariables?: readonly string[];
}

function PenLineBase({
  className,
  lines = ['Where being a sales rep is not the end goal.'],
  progressVariables,
}: PenLineProps) {
  return (
    <p className={className}>
      <span className="pen-lines">
        {lines.map((line, index) => {
          const progressVariable = progressVariables?.[index];
          return (
            <span
              className="pen-line"
              data-pen-line={index}
              key={`${index}-${line}`}
              style={{ '--pen-progress': progressVariable ? `var(${progressVariable}, 0)` : 1 } as React.CSSProperties}
            >
              <span className="pen-line-text">{line}</span>
              <span className="pen-line-dot" aria-hidden="true" />
            </span>
          );
        })}
      </span>
    </p>
  );
}

export const PenLine = memo(PenLineBase);
export default PenLine;
