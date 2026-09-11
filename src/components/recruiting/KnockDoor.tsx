import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Pass 179 - the knock.
 *
 * A flat door drawn in CSS inside the hero. Every tap, click, Enter or Space is
 * one knock: the door swings on a rotateY, warm light spills out of the opening
 * and the next line of the fixed sequence reads in the doorway. After the fifth
 * knock the door stays open and the Apply button sits inside it.
 *
 * Under prefers-reduced-motion the swing and the light resolve to a plain open
 * state (handled in index.css); the sequence still advances on a tap.
 */
export const KNOCK_LINES = [
  'Knock one. Every account starts here.',
  'Knock two. Most people say no. You keep going.',
  'Knock three. Someone says yes.',
  'Knock four. Log it the same day.',
  'Knock five. Now do it again.',
];

export const KNOCK_FINAL = 'Ready to knock for real';

export function KnockDoor() {
  const [knocks, setKnocks] = useState(0);

  const done = knocks >= KNOCK_LINES.length;
  const line = done ? KNOCK_FINAL : KNOCK_LINES[knocks - 1] || '';

  return (
    <div className="knock-wrap">
      <button
        type="button"
        aria-label="Knock"
        onClick={() => setKnocks((n) => Math.min(KNOCK_LINES.length, n + 1))}
        className={`knock-door ${knocks > 0 ? 'knock-open' : ''} ${done ? 'knock-done' : ''}`}
      >
        <span className="knock-frame" aria-hidden="true" />
        <span className="knock-light" aria-hidden="true" />
        <span className="knock-panel" aria-hidden="true">
          <span className="knock-handle" />
        </span>
      </button>

      <div className="knock-words" aria-live="polite">
        {line && <p className="knock-line">{line}</p>}
        {done && (
          <Button asChild className="primary-sheen mt-3 min-h-12 w-full overflow-hidden px-6 font-bold">
            <Link to="/apply/rookie">Apply <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs tabular-nums text-text-muted">Knocks: {knocks}</p>
    </div>
  );
}

export default KnockDoor;
