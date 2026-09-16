import { memo } from 'react';

/** Selectable handwriting revealed one character at a time. */

export interface PenLineProps {
  className?: string;
  lines?: readonly string[];
  progressVariables?: readonly string[];
  windowDurations?: readonly number[];
  caret?: boolean;
  shatterVariable?: string;
}

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 73.19 + salt * 41.73) * 43758.5453;
  return value - Math.floor(value);
}

function PenLineBase({
  className,
  lines = ['Where being a sales rep is not the end goal.'],
  progressVariables,
  windowDurations,
  caret = false,
  shatterVariable,
}: PenLineProps) {
  let characterOffset = 0;
  return (
    <p className={className}>
      <span className="pen-lines">
        {lines.map((line, index) => {
          const progressVariable = progressVariables?.[index];
          const windowDuration = windowDurations?.[index] ?? 850;
          const characterDuration = Math.min(1, 90 / windowDuration);
          const characters = Array.from(line);
          const lineOffset = characterOffset;
          characterOffset += characters.length;
          return (
            <span
              className="pen-line"
              data-pen-line={index}
              key={`${index}-${line}`}
              style={{
                '--pen-progress': progressVariable ? `var(${progressVariable}, 0)` : 1,
                '--char-scale': 1 / characterDuration,
                '--shatter-progress': shatterVariable ? `var(${shatterVariable}, 0)` : 0,
              } as React.CSSProperties}
            >
              <span className="pen-line-readable">{line}</span>
              <span className="pen-line-visual" aria-hidden="true">
                {characters.map((character, characterIndex) => {
                  const denominator = Math.max(1, characters.length - 1);
                  const start = (characterIndex / denominator) * (1 - characterDuration);
                  const next = characterIndex === characters.length - 1
                    ? 0.999
                    : ((characterIndex + 1) / denominator) * (1 - characterDuration);
                  const globalIndex = lineOffset + characterIndex;
                  const direction = characterIndex < characters.length / 2 ? -1 : 1;
                  const distance = 28 + seeded(globalIndex, 1) * 56;
                  return (
                    <span
                      className="pen-character"
                      key={`${characterIndex}-${character}`}
                      style={{
                        '--char-start': start,
                        '--char-next': next,
                        '--shatter-x': `${direction * distance}px`,
                        '--shatter-y': `${(seeded(globalIndex, 2) - 0.5) * 96}px`,
                        '--shatter-r': `${(seeded(globalIndex, 3) - 0.5) * 110}deg`,
                      } as React.CSSProperties}
                    >
                      {character === ' ' ? '\u00A0' : character}
                      {caret && <span className="pen-caret" aria-hidden="true" />}
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
