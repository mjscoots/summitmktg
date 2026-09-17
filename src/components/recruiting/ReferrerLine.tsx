import { useEffect, useState } from 'react';
import { captureSourceFromUrl, readStoredCode } from '@/lib/source';

/**
 * Pass 224 - someone arriving on a rep's link sees that rep's name on the
 * first screen, because that name is the whole difference between a referral
 * and a cold click. It resolves through the same code lookup the application
 * uses. No code, or a code that resolves to nobody, renders nothing at all.
 */
export function ReferrerLine() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!readStoredCode()) return;
    let alive = true;
    captureSourceFromUrl().then((source) => {
      if (alive) setName(source.referrer_name?.trim() || null);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!name) return null;

  return <p className="cover-first-referrer">{name} sent you.</p>;
}

export default ReferrerLine;
