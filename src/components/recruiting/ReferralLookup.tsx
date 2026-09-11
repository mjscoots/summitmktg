import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pass 179 - know someone here.
 *
 * One input under the final Apply band. After three characters and a 300ms
 * pause the text is checked against the existing public pillar_link_lookup. A
 * match shows the pillar first name and a plain line that routes to that
 * existing link; no match simply carries the text into the application's
 * referral field. Nothing is written and no new function is added.
 */
interface Match {
  token: string;
  name: string;
}

export function ReferralLookup() {
  const [text, setText] = useState('');
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    const value = text.trim();
    if (value.length < 3) {
      setMatch(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data } = await (supabase as any).rpc('pillar_link_lookup', { p_token: value });
      if (cancelled) return;
      const row = data as { valid?: boolean; pillar_name?: string } | null;
      if (row?.valid && row.pillar_name) {
        setMatch({ token: value, name: String(row.pillar_name).trim().split(' ')[0] });
      } else {
        setMatch(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text]);

  const referral = new URLSearchParams(text.trim() ? { referral: text.trim().slice(0, 80) } : {}).toString();

  return (
    <div className="mx-auto mt-10 max-w-md text-left">
      <label htmlFor="referral-lookup" className="block text-sm text-text-secondary">
        Who told you about Trinity
      </label>
      <input
        id="referral-lookup"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-text-muted"
      />
      <div className="mt-3 min-h-11" aria-live="polite">
        {match ? (
          <Link
            to={`/p/${encodeURIComponent(match.token)}`}
            className="public-link inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
          >
            Apply with {match.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : text.trim().length >= 3 ? (
          <Link
            to={`/apply/rookie${referral ? `?${referral}` : ''}`}
            className="public-link inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
          >
            Carry that into your application <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default ReferralLookup;
