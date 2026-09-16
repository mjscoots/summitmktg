import { memo } from 'react';

/** Selectable handwriting revealed one character at a time. */

export interface PenLineProps {
  className?: string;
  lines?: readonly string[];
  progressVariables?: readonly string[];
  windowDurations?: readonly number[];
}

function PenLineBase({
  className,
  lines = ['Where being a sales rep is not the end goal.'],
  progressVariables,
  windowDurations,
}: PenLineProps) {
  return (
    <p className={className}>
      <span className="pen-lines">
        {lines.map((line, index) => {
          const progressVariable = progressVariables?.[index];
          const windowDuration = windowDurations?.[index] ?? 850;
          const characterDuration = Math.min(1, 90 / windowDuration);
          const characters = Array.from(line);
          return (
            <span
              className="pen-line"
              data-pen-line={index}
              key={`${index}-${line}`}
              style={{
                '--pen-progress': progressVariable ? `var(${progressVariable}, 0)` : 1,
                '--char-scale': 1 / characterDuration,
              } as React.CSSProperties}
            >
              <span className="pen-line-readable">{line}</span>
              <span className="pen-line-visual" aria-hidden="true">
                {characters.map((character, characterIndex) => {
                  const denominator = Math.max(1, characters.length - 1);
                  const start = (characterIndex / denominator) * (1 - characterDuration);
                  return (
                    <span
                      className="pen-character"
                      key={`${characterIndex}-${character}`}
                      style={{ '--char-start': start } as React.CSSProperties}
                    >
                      {character === ' ' ? '\u00A0' : character}
                    </span>
                  );
                })}
              </span>
            </span>
          );
        })}
      </span>
    </p>
  );
}

export const PenLine = memo(PenLineBase);
export default PenLine;
