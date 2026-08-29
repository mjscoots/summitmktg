import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

const PRODUCTION_LINES = [
  'A verified Summit rep sold $429,000 in accounts last summer.',
  'A verified Summit rep sold $314,000 in accounts last summer.',
  'A verified Summit rep sold $286,000 in accounts last summer.',
  'A verified Summit rep sold $242,000 in accounts last summer.',
  'A verified Summit rep sold $227,000 in accounts last summer.',
  'A verified Summit rep sold $192,000 in accounts last summer.',
  'A verified Summit rep sold $158,000 in accounts last summer.',
  'A verified Summit rep sold $142,000 in accounts last summer.',
  '20 Summit reps each sold over $100,000 last summer.',
  '36 reps sold over $50,000.',
  'The team serviced over $6,000,000 in accounts.',
] as const;

function shuffledLines(): string[] {
  const lines = [...PRODUCTION_LINES];
  for (let index = lines.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]];
  }
  return lines;
}

export function ProductionTicker() {
  const lines = useMemo(shuffledLines, []);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (started) return;
    const root = document.getElementById('root');
    const start = () => setStarted(true);
    root?.addEventListener('scroll', start, { passive: true, once: true });
    window.addEventListener('scroll', start, { passive: true, once: true });
    return () => {
      root?.removeEventListener('scroll', start);
      window.removeEventListener('scroll', start);
    };
  }, [started]);

  useEffect(() => {
    const handleVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!started || !visible || dismissed) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [dismissed, index, lines.length, started, visible]);

  if (!started || !visible || dismissed) return null;

  return (
    <aside className="production-ticker" aria-live="polite" aria-atomic="true">
      <Button
        key={index}
        type="button"
        variant="ghost"
        onClick={() => setDismissed(true)}
        className="production-ticker-card h-auto min-h-11 whitespace-normal text-left"
        aria-label={`${lines[index]} Dismiss production update`}
      >
        <span className="production-ticker-dot" aria-hidden="true" />
        <span>{lines[index]}</span>
      </Button>
    </aside>
  );
}

export { PRODUCTION_LINES };