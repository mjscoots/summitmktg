import { forwardRef, memo, useId } from "react";

/**
 * Pass 181 - TRNTY alone, and the peak.
 *
 * The wordmark is the five letters TRNTY set in Archivo 800, uppercase, letter
 * spacing 0.04em, drawn as SVG text so it scales with the height prop. There is
 * no TRINITY SALES line and no mark inside any lockup: every variant renders the
 * letters only, at its size. The `mark` variant renders the peak, a single clean
 * isosceles triangle filled with the blue to violet gradient, blue at the base
 * and violet at the apex, no stroke and no inner lines.
 *
 * Variant names and props are unchanged from the previous logo so every import
 * keeps working. TRNTY and the peak never appear side by side.
 */
export type WordmarkVariant =
  | "hero"
  | "heroMono"
  | "heroFiber"
  | "heroLife"
  | "full"
  | "fullV2"
  | "stacked"
  | "compact"
  | "compactPlain"
  | "mark";

const BODY_STACK = "'Archivo', system-ui, -apple-system, sans-serif";

/** The peak: base 1.0 and height 0.82 of a 64 x 64 box, flat base, centred. */
export const MARK_PATH = "M32 11.52 L64 64 L0 64 Z";

interface WordmarkProps {
  variant?: WordmarkVariant;
  /** Rendered height in px. */
  height?: number;
  className?: string;
  /** Staggers the five letters on first mount. */
  animate?: boolean;
}

const WordmarkBase = forwardRef<SVGSVGElement, WordmarkProps>(function WordmarkBase(
  { variant = "hero", height = 32, className, animate = false },
  ref
) {
  const renderedHeight = Math.max(height, 12);
  const gradientId = useId();

  if (variant === "mark") {
    const size = renderedHeight;
    return (
      <svg
        ref={ref}
        role="img"
        aria-label="Trinity Sales"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={className}
        style={{ display: "block" }}
      >
        <title>Trinity Sales</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#3A8DFF" />
            <stop offset="0.52" stopColor="#7C6BFF" />
            <stop offset="1" stopColor="#B69CFF" />
          </linearGradient>
        </defs>
        <path d={MARK_PATH} fill={`url(#${gradientId})`} />
      </svg>
    );
  }

  const mono = variant === "heroMono";
  const letters = mono ? "var(--wordmark-outline, currentColor)" : "var(--wordmark-letters, currentColor)";

  const fontSize = renderedHeight * 0.82;
  const letterStep = fontSize * 0.72;
  const baseline = renderedHeight * 0.82;
  const width = Math.round(letterStep * 5 + fontSize * 0.1);

  return (
    <svg
      ref={ref}
      role="img"
      aria-label="TRNTY, Trinity Sales"
      viewBox={`0 0 ${width} ${renderedHeight}`}
      width={width}
      height={renderedHeight}
      className={className}
      style={{ display: "block" }}
    >
      <title>Trinity Sales</title>
      <g aria-hidden="true">
        {"TRNTY".split("").map((letter, index) => (
          <text
            key={`${letter}-${index}`}
            x={index * letterStep}
            y={baseline}
            fill={letters}
            className={animate ? "wordmark-letter" : undefined}
            style={{
              fontFamily: BODY_STACK,
              fontWeight: 800,
              fontSize: `${fontSize}px`,
              letterSpacing: "0.04em",
              animationDelay: animate ? `calc(${index + 1} * var(--motion-stagger))` : undefined,
            }}
          >
            {letter}
          </text>
        ))}
      </g>
    </svg>
  );
});

export const Wordmark = memo(WordmarkBase);
export default Wordmark;
