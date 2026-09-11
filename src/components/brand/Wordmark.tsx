import { forwardRef, memo } from "react";
import { LETTERS_PATH, LOGO_ASPECT, LOGO_BLUE, LOGO_VIEWBOX, MOUNTAIN_PATH, MOUNTAIN_VIEWBOX } from "./logoPaths";

/**
 * Pass 183 - the owner's real logo.
 *
 * TRNTY where the N is a mountain range. The traced letters and the traced
 * mountain are inlined from logoPaths, so the component takes a className and
 * never needs currentColor. The letters are white on dark and black on light,
 * read from the --wordmark-letters token; the mountain stays the logo blue in
 * both appearances.
 *
 * Every lettered variant renders the same logo, scaled to its height prop. The
 * mark variant renders the mountain path alone, which is also what the icons,
 * the favicon, the splash and the footer stamp use.
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

/** Kept for callers that still draw the peak themselves. */
export const MARK_PATH = MOUNTAIN_PATH;

interface WordmarkProps {
  variant?: WordmarkVariant;
  /** Rendered height in px. */
  height?: number;
  className?: string;
  /** Staggers the two logo layers on first mount. */
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
        viewBox={MOUNTAIN_VIEWBOX}
        width={size}
        height={size}
        className={className}
        style={{ display: "block" }}
      >
        <title>Trinity Sales</title>
        <path d={MOUNTAIN_PATH} fill={LOGO_BLUE} fillRule="evenodd" />
      </svg>
    );
  }

  const letters = variant === "heroMono" ? "var(--wordmark-outline, #FFFFFF)" : "var(--wordmark-letters, #FFFFFF)";
  const width = Math.round(renderedHeight * LOGO_ASPECT);

  return (
    <svg
      ref={ref}
      role="img"
      aria-label="TRNTY, Trinity Sales"
      viewBox={LOGO_VIEWBOX}
      width={width}
      height={renderedHeight}
      className={className}
      style={{ display: "block" }}
    >
      <title>Trinity Sales</title>
      <g aria-hidden="true">
        <path
          d={LETTERS_PATH}
          fill={letters}
          fillRule="evenodd"
          className={animate ? "wordmark-letter" : undefined}
        />
        <path
          d={MOUNTAIN_PATH}
          fill={LOGO_BLUE}
          fillRule="evenodd"
          className={animate ? "wordmark-lockup-line" : undefined}
        />
      </g>
    </svg>
  );
});

export const Wordmark = memo(WordmarkBase);
export default Wordmark;
