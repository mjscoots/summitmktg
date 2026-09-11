import { useState } from 'react';

/**
 * Pass 186 - what the applicant actually wants.
 *
 * Three questions shared by both applications. The values here are the only
 * ones the edge function accepts for the first two questions.
 */
export const INTEREST_OPTIONS = ['Pest control', 'Fiber internet', 'Life insurance', 'Not sure yet'] as const;
export const STYLE_OPTIONS = ['In person sales', 'Remote sales', 'Either'] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];
export type SalesStyle = (typeof STYLE_OPTIONS)[number];

export function useWants() {
  const [interestedIn, setInterestedIn] = useState<Interest[]>([]);
  const [salesStyle, setSalesStyle] = useState<SalesStyle | ''>('');
  const [earningsGoal, setEarningsGoal] = useState('');

  const toggleInterest = (value: Interest) =>
    setInterestedIn((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  /** Shaped for the submit body: blank answers go over as null. */
  const payload = () => ({
    interested_in: interestedIn.length ? interestedIn : null,
    sales_style: salesStyle || null,
    earnings_goal: earningsGoal.trim() || null,
  });

  return { interestedIn, toggleInterest, salesStyle, setSalesStyle, earningsGoal, setEarningsGoal, payload };
}

export default function WantsStep({ wants }: { wants: ReturnType<typeof useWants> }) {
  const { interestedIn, toggleInterest, salesStyle, setSalesStyle, earningsGoal, setEarningsGoal } = wants;

  return (
    <section className="public-surface p-5 sm:p-6">
      <h2 className="mb-4 text-base font-extrabold text-foreground">What you want</h2>

      <fieldset className="mb-6">
        <legend className="mb-2 block text-sm font-medium text-foreground">
          What are you most interested in?
        </legend>
        <p className="mb-2 text-xs text-text-secondary">Choose one or more.</p>
        <div className="grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={interestedIn.includes(option)}
              onClick={() => toggleInterest(option)}
              className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${
                interestedIn.includes(option)
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2 block text-sm font-medium text-foreground">In person or remote?</legend>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={salesStyle === option}
              onClick={() => setSalesStyle(option)}
              className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${
                salesStyle === option
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium text-foreground mb-2" htmlFor="earnings-goal">
        What is your earnings goal for your first year?
      </label>
      <input
        id="earnings-goal"
        type="text"
        value={earningsGoal}
        onChange={(e) => setEarningsGoal(e.target.value)}
        placeholder="Your number"
        className="input-field"
      />
    </section>
  );
}
