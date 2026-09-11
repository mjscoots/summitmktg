import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pass 179 - your year.
 *
 * Twelve months in a track with a lime marker the visitor drags, taps or moves
 * with the arrow keys. The card under the track carries the same four step
 * lines the season section already used, now placed in the months they belong
 * to, plus one line naming the lane that is live that month.
 *
 * While the marker is held the cover sky scalar follows the month (summer
 * bright, winter dark) through `onDay`; on release it returns to the scroll
 * value. Under prefers-reduced-motion nothing animates and the sky is left
 * alone.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Band {
  title: string;
  line: string | null;
  lane: string;
}

/** The step copy the season section already carried, placed by month. */
const BANDS: Band[] = [
  { title: 'Apply', line: 'A short form, then a call with a manager.', lane: 'Pest' },
  { title: 'Apply', line: 'A short form, then a call with a manager.', lane: 'Pest' },
  { title: 'Train', line: 'Scripts, product and practice before you knock.', lane: 'Pest' },
  { title: 'Sell the season', line: 'You work an area with your team through the summer.', lane: 'Pest' },
  { title: 'Sell the season', line: 'You work an area with your team through the summer.', lane: 'Pest' },
  { title: 'Sell the season', line: 'You work an area with your team through the summer.', lane: 'Pest' },
  { title: 'Sell the season', line: 'You work an area with your team through the summer.', lane: 'Pest' },
  { title: 'Sell the season', line: 'You work an area with your team through the summer.', lane: 'Pest' },
  { title: 'Settle up', line: 'Your pay follows the scale you reached.', lane: 'Pest' },
  { title: 'Off season', line: null, lane: 'Fiber' },
  { title: 'Off season', line: null, lane: 'Fiber' },
  { title: 'Off season', line: null, lane: 'Fiber' },
];

/** Winter dark, summer bright, on the same 0 to 1 scale the scene reads. */
function monthDay(index: number): number {
  return 0.1 + 0.9 * (0.5 - 0.5 * Math.cos(((index + 0.5) / 12) * Math.PI * 2 + Math.PI));
}

export function YearStrip({ onDay }: { onDay?: (day: number | null) => void }) {
  const [index, setIndex] = useState(3);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const band = BANDS[index];

  const pick = useCallback(
    (clientX: number, live: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / Math.max(1, rect.width);
      const next = Math.min(11, Math.max(0, Math.round(ratio * 11)));
      setIndex(next);
      if (live) onDay?.(monthDay(next));
    },
    [onDay]
  );

  useEffect(() => () => onDay?.(null), [onDay]);

  return (
    <div>
      <div
        ref={trackRef}
        className="year-track"
        role="slider"
        tabIndex={0}
        aria-label="Your year"
        aria-valuemin={1}
        aria-valuemax={12}
        aria-valuenow={index + 1}
        aria-valuetext={MONTHS[index]}
        onPointerDown={(event) => {
          (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
          pick(event.clientX, true);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0) return;
          pick(event.clientX, true);
        }}
        onPointerUp={() => onDay?.(null)}
        onPointerCancel={() => onDay?.(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIndex((i) => Math.min(11, i + 1));
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          }
        }}
      >
        <span className="year-rail" aria-hidden="true" />
        <span
          className="year-marker"
          aria-hidden="true"
          style={{ left: `${(index / 11) * 100}%` }}
        />
        <div className="year-months">
          {MONTHS.map((month, i) => (
            <button
              key={month}
              type="button"
              onClick={() => setIndex(i)}
              className={`year-month ${i === index ? 'year-month-on' : ''}`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <div className="year-card card-spotlight mt-8 bg-card p-5">
        <p className="micro-label text-primary">{MONTHS[index]}</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{band.title}</h3>
        {band.line && <p className="mt-3 max-w-[60ch] text-sm text-text-secondary">{band.line}</p>}
        <p className="mt-4 text-sm text-text-muted">Live lane: {band.lane}. Life is coming.</p>
      </div>
    </div>
  );
}

export default YearStrip;
