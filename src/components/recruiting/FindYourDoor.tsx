import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';


/**
 * Pass 179 - find your door.
 *
 * Three taps, then the lane and the application in plain words. The answers ride
 * to the form as query params the application already reads (vertical) plus
 * market and start, which the forms prefill on mount. Nothing is written here.
 */
type Sold = 'yes' | 'no';
type Start = 'this' | 'next' | 'unsure';

const SOLD: { value: Sold; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const START: { value: Start; label: string }[] = [
  { value: 'this', label: 'This season' },
  { value: 'next', label: 'Next season' },
  { value: 'unsure', label: 'Not sure' },
];

const START_WORDS: Record<Start, string> = {
  this: 'this season',
  next: 'next season',
  unsure: 'when you are ready',
};

export function FindYourDoor() {
  const [sold, setSold] = useState<Sold | null>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [market, setMarket] = useState('');

  // Sold before goes to the veteran form; everyone else starts as a rookie.
  const veteran = sold === 'yes';
  // A next season or unsure start reads as the off season lane first.
  const lane = start === 'this' ? 'Pest' : 'Fiber';
  const path = veteran ? '/apply/veteran' : '/apply/rookie';
  const params = new URLSearchParams({ vertical: lane });
  if (market.trim()) params.set('market', market.trim().slice(0, 80));
  if (start) params.set('start', start);

  const ready = sold !== null && start !== null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
      <div className="qual-card card-spotlight bg-card p-5">
        <p className="micro-label text-text-muted">One</p>
        <h3 className="mt-3 text-lg font-bold text-foreground">Have you sold door to door before</h3>
        <div className="mt-4 grid gap-2">
          {SOLD.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSold(option.value)}
              className={`qual-choice ${sold === option.value ? 'qual-choice-on' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`qual-card card-spotlight bg-card p-5 ${sold ? 'qual-in' : 'qual-hold'}`}>
        <p className="micro-label text-text-muted">Two</p>
        <h3 className="mt-3 text-lg font-bold text-foreground">When can you start</h3>
        <div className="mt-4 grid gap-2">
          {START.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={!sold}
              onClick={() => setStart(option.value)}
              className={`qual-choice ${start === option.value ? 'qual-choice-on' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`qual-card card-spotlight bg-card p-5 ${start ? 'qual-in' : 'qual-hold'}`}>
        <p className="micro-label text-text-muted">Three</p>
        <h3 className="mt-3 text-lg font-bold text-foreground">Where are you</h3>
        <input
          value={market}
          onChange={(event) => setMarket(event.target.value)}
          disabled={!start}
          placeholder="City, state"
          aria-label="Where are you"
          className="mt-4 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-text-muted"
        />
        {ready && (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">
              {veteran ? 'Vet' : 'Rookie'}, {lane}, {START_WORDS[start as Start]}
              {market.trim() ? `, ${market.trim()}` : ''}. Your application takes about four minutes.
            </p>
            <Link
              to={`${path}?${params.toString()}`}
              className="btn-gradient mt-4 inline-flex w-full items-center justify-center gap-2 px-6 font-bold"
            >
              Get in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default FindYourDoor;
