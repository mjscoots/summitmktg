import { forwardRef, memo } from "react";

/**
 * Pass 175 - Trinity Sales.
 *
 * Wordmark: TRNTY set in Space Grotesk 700, letter spacing 0.08em, drawn as
 * SVG text so it scales with the height prop. The full lockup adds TRINITY
 * SALES underneath in lime at 10 to 11px with 0.3em tracking. The compact
 * wordmark is TRNTY alone. The small mark is one continuous ridgeline of three
 * peaks, a single 2px lime stroke, centre peak tallest, no fill.
 *
 * Variant names and props are unchanged from the previous logo so every import
 * keeps working.
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

const DISPLAY_STACK = "'Space Grotesk', 'Inter', system-ui, sans-serif";

const LOCKUP_VARIANTS: WordmarkVariant[] = ["hero", "heroMono", "heroFiber", "heroLife", "full", "fullV2", "stacked"];

interface WordmarkProps {
  variant?: WordmarkVariant;
  /** Rendered height in px. */
  height?: number;
  className?: string;
  /** Staggers the five letters and lockup line on first mount. */
  animate?: boolean;
}

const WordmarkBase = forwardRef<SVGSVGElement, WordmarkProps>(function WordmarkBase(
  { variant = "hero", height = 32, className, animate = false },
  ref
) {
  const renderedHeight = Math.max(height, 12);

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
        <path
          d="M4 48 L17 30 L24 39 L32 15 L41 39 L48 30 L60 48"
          fill="none"
          stroke="var(--wordmark-accent, #B4F53B)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const lockup = LOCKUP_VARIANTS.includes(variant) && renderedHeight >= 40;
  const mono = variant === "heroMono";
  const letters = mono ? "#FFFFFF" : "var(--wordmark-letters, currentColor)";

  // A 5-letter wordmark at 0.08em tracking sits close to 2.9:1 wide to tall.
  const glyphHeight = lockup ? renderedHeight * 0.66 : renderedHeight;
  const width = Math.round(glyphHeight * 2.95);
  const baseline = lockup ? glyphHeight * 0.94 : renderedHeight * 0.78;

  const fontSize = glyphHeight * 0.86;
  const letterStep = fontSize * 0.7;

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
        {'TRNTY'.split('').map((letter, index) => (
          <text
            key={`${letter}-${index}`}
            x={index * letterStep}
            y={baseline}
            fill={letters}
            className={animate ? 'wordmark-letter' : undefined}
            style={{
              fontFamily: DISPLAY_STACK,
              fontWeight: 700,
              fontSize: `${fontSize}px`,
              animationDelay: animate ? `calc(${index} * var(--motion-stagger))` : undefined,
            }}
          >
            {letter}
          </text>
        ))}
      </g>
      {lockup && (
        <text
          x="1"
          y={renderedHeight * 0.96}
          fill="var(--wordmark-accent, #B4F53B)"
          className={animate ? 'wordmark-lockup-line' : undefined}
          style={{
            fontFamily: DISPLAY_STACK,
            fontWeight: 700,
            fontSize: `${Math.max(10, Math.min(11, renderedHeight * 0.14))}px`,
            letterSpacing: "0.3em",
          }}
        >
          TRINITY SALES
        </text>
      )}
    </svg>
  );
});

export const Wordmark = memo(WordmarkBase);
export default Wordmark;
