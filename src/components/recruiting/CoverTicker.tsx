import { usePublicCounters } from '@/hooks/usePublicRecruiting';

/**
 * Pass 183 - the ticker band, directly under the hero.
 *
 * Real items only: the offices as they exist in the roster today, the live
 * counter values in words, and the three lanes. The counters come from the same
 * get_public_counters call and the same owner thresholds as the proof strip, so
 * anything the proof strip would hide is hidden here too.
 *
 * The marquee is CSS only: one track, duplicated once and hidden from screen
 * readers, translated by exactly half its own width over 40 seconds so the loop
 * never jumps. Paused under prefers-reduced-motion.
 */
const OFFICES = ['Baltimore', 'Boston'];
const LANES = ['Pest', 'Fiber', 'Life coming'];

export function CoverTicker() {
  const counters = usePublicCounters();

  const items: string[] = [...OFFICES];
  if (counters?.active_reps && counters.active_reps > 0) items.push(`${counters.active_reps} in the field`);
  if (counters?.signed_season && counters.signed_season > 0) items.push(`${counters.signed_season} signed this season`);
  if (counters?.signed_2027 && counters.signed_2027 > 0) items.push(`${counters.signed_2027} signed for 2027`);
  items.push(...LANES);

  const track = (
    <span className="cover-ticker-track">
      {items.map((item) => (
        <span key={item} className="cover-ticker-item">
          <span className="cover-ticker-dot" aria-hidden="true" />
          {item}
        </span>
      ))}
    </span>
  );

  return (
    <div className="cover-ticker public-section" aria-label="Trinity offices, team and lanes">
      <div className="cover-ticker-rail">
        {track}
        <span aria-hidden="true">{track}</span>
      </div>
    </div>
  );
}

export default CoverTicker;
