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
  let characterOffset = 0;
  return (
    <p className={className}>
      <span className="pen-lines">
        {lines.map((line, index) => {
          const progressVariable = progressVariables?.[index];
          const windowDuration = windowDurations?.[index] ?? 850;
          const characterDuration = Math.min(1, 90 / windowDuration);
          const characters = Array.from(line);
          const tokens = line.split(/(\s+)/).filter(Boolean);
          const lineOffset = characterOffset;
          characterOffset += characters.length;
          let tokenOffset = 0;
          const renderCharacter = (character: string, characterIndex: number) => {
            const denominator = Math.max(1, characters.length - 1);
            const start = (characterIndex / denominator) * (1 - characterDuration);
            const distance = 28 + seeded(globalIndex, 1) * 56;
            return (
              <span
                className="pen-character"
                key={`${characterIndex}-${character}`}
                style={{
                  '--char-start': start,
                } as React.CSSProperties}
              >
                {character}
              </span>
            );
          };
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
                {tokens.map((token, tokenIndex) => {
                  const startIndex = tokenOffset;
                  tokenOffset += token.length;
                  if (/^\s+$/.test(token)) {
                    return Array.from(token).map((character, index) => renderCharacter(character, startIndex + index));
                  }
                  return (
                    <span className="pen-word" key={`${tokenIndex}-${token}`}>
                      {Array.from(token).map((character, index) => renderCharacter(character, startIndex + index))}
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
