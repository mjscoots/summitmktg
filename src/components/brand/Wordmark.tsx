import { forwardRef, memo } from "react";

/**
 * Pass 180 - Trinity Sales, warm ink and ember.
 *
 * Wordmark: TRNTY set in Instrument Serif Regular, capitals, letter spacing
 * 0.12em, drawn as SVG text so it scales with the height prop. The full lockup
 * puts the mark left of TRNTY at cap height with a 0.5em gap, and adds TRINITY
 * SALES underneath in Geist 500 at 10 to 11px with 0.3em tracking, ember on
 * dark and #B23E12 on light. The compact wordmark is TRNTY alone. The mark is a
 * solid three peak silhouette filled in ember, centre peak tallest, flat base,
 * corners softened.
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

const DISPLAY_STACK = "'Instrument Serif', 'Geist', Georgia, serif";
const BODY_STACK = "'Geist', 'DM Sans', system-ui, sans-serif";

/** The solid three peak silhouette, drawn on a 64 x 64 box with a flat base. */
export const MARK_PATH = "M1 54 L16 23.2 L24 34 L32 10 L41 33 L50 27.6 L63 54 Z";

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
  const accent = "var(--wordmark-accent, #F2673A)";

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
        <path d={MARK_PATH} fill={accent} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  const lockup = LOCKUP_VARIANTS.includes(variant) && renderedHeight >= 40;
  const mono = variant === "heroMono";
  const letters = mono ? "var(--wordmark-outline, currentColor)" : "var(--wordmark-letters, currentColor)";

  const glyphHeight = lockup ? renderedHeight * 0.66 : renderedHeight;
  const fontSize = glyphHeight * 0.9;
  const letterStep = fontSize * 0.68;
  const baseline = lockup ? glyphHeight * 0.94 : renderedHeight * 0.8;

  // The mark rides at cap height to the left of the first letter, with a gap of
  // half an em. Only the lockup carries it.
  const markSize = lockup ? fontSize * 0.78 : 0;
  const markGap = lockup ? fontSize * 0.5 : 0;
  const textX = markSize + markGap;
  const width = Math.round(textX + letterStep * 5 + fontSize * 0.2);

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
      {lockup && (
        <g
          aria-hidden="true"
          transform={`translate(0 ${baseline - markSize}) scale(${markSize / 64})`}
          className={animate ? "wordmark-letter" : undefined}
        >
          <path d={MARK_PATH} fill={accent} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}
      <g aria-hidden="true">
        {"TRNTY".split("").map((letter, index) => (
          <text
            key={`${letter}-${index}`}
            x={textX + index * letterStep}
            y={baseline}
            fill={letters}
            className={animate ? "wordmark-letter" : undefined}
            style={{
              fontFamily: DISPLAY_STACK,
              fontWeight: 400,
              fontSize: `${fontSize}px`,
              letterSpacing: "0.12em",
              animationDelay: animate ? `calc(${index + 1} * var(--motion-stagger))` : undefined,
            }}
          >
            {letter}
          </text>
        ))}
      </g>
      {lockup && (
        <text
          x={textX + 1}
          y={renderedHeight * 0.96}
          fill={accent}
          className={animate ? "wordmark-lockup-line" : undefined}
          style={{
            fontFamily: BODY_STACK,
            fontWeight: 500,
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
