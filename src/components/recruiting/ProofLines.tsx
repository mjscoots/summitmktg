import { usePublicCounters } from '@/hooks/usePublicRecruiting';
import { proofLines, topRepsLine } from '@/lib/publicProof';

/**
 * Pass 221 - live production proof, aggregates only.
 *
 * A figure that cannot be queried renders no line, and no lines renders
 * nothing at all: no placeholder, no zero, no dash, no cached value.
 */

/** The single first-screen line: reps over $100,000. */
export function ProofHeadline({ className = '' }: { className?: string }) {
  const counters = usePublicCounters();
  const line = topRepsLine(counters);
  if (!line) return null;
  return <p className={`cover-first-proof ${className}`}>{line}</p>;
}

/** The full set, for the foot of the page beside the apply band. */
export function ProofSet() {
  const counters = usePublicCounters();
  const lines = proofLines(counters);
  if (lines.length === 0) return null;
  return (
    <ul className="proof-set" aria-label="Verified team production">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
