import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePublicCounters } from '@/hooks/usePublicRecruiting';
import { proofLines } from '@/lib/publicProof';

function shuffled(input: string[]): string[] {
  const lines = [...input];
  for (let index = lines.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]];
  }
  return lines;
}

/**
 * Pass 221 - the ticker no longer carries hardcoded digits. Every line is
 * built from the live aggregates, so a figure that cannot be queried simply
 * has no line, and with no figures at all the ticker does not render.
 */
export function ProductionTicker() {
  const counters = usePublicCounters();
  const live = useMemo(() => proofLines(counters), [counters]);
  const lines = useMemo(() => shuffled(live), [live]);
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
    if (!started || !visible || dismissed || lines.length === 0) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [dismissed, index, lines.length, started, visible]);

  if (!started || !visible || dismissed || lines.length === 0) return null;
  const line = lines[index % lines.length];

  return (
    <aside className="production-ticker" aria-live="polite" aria-atomic="true">
      <Button
        key={index}
        type="button"
        variant="ghost"
        onClick={() => setDismissed(true)}
        className="production-ticker-card h-auto min-h-11 whitespace-normal text-left"
        aria-label={`${line} Dismiss production update`}
      >
        <span className="production-ticker-dot" aria-hidden="true" />
        <span>{line}</span>
      </Button>
    </aside>
  );
}
