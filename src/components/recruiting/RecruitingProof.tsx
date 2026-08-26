import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProofData {
  team_size?: string;
  years_running?: string;
  rookie_avg_earnings?: string;
  top_rookie?: string;
  video_url?: string;
}

export const PROOF_FIELDS: { key: keyof ProofData; label: string; hint: string }[] = [
  { key: 'team_size', label: 'Team size', hint: 'e.g. 34' },
  { key: 'years_running', label: 'Years running', hint: 'e.g. 6' },
  { key: 'rookie_avg_earnings', label: 'Avg first-summer rookie', hint: 'e.g. $18,400' },
  { key: 'top_rookie', label: 'Top rookie', hint: 'e.g. $41,000' },
  { key: 'video_url', label: 'Video URL (optional)', hint: 'https://...' },
];

const STAT_KEYS: (keyof ProofData)[] = ['team_size', 'years_running', 'rookie_avg_earnings', 'top_rookie'];

const LABELS: Record<string, string> = {
  team_size: 'Reps on the team',
  years_running: 'Years running',
  rookie_avg_earnings: 'Avg first summer, rookie',
  top_rookie: 'Top rookie summer',
};

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch {
    return null;
  }
}

export function RecruitingProof() {
  const [proof, setProof] = useState<ProofData | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc('get_recruiting_proof');
      setProof((data as ProofData) || {});
    })();
  }, []);

  if (!proof) return null;

  const stats = STAT_KEYS.filter((k) => (proof[k] || '').toString().trim().length > 0);
  const embed = proof.video_url ? toEmbed(proof.video_url) : null;

  // No fabricated numbers — if nothing is filled in, render nothing at all.
  if (stats.length === 0 && !proof.video_url) return null;

  return (
    <section className="py-16 border-y border-border">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-8">
          The numbers
        </p>

        {stats.length > 0 && (
          <div
            className={`grid gap-4 ${stats.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : stats.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs mx-auto'}`}
          >
            {stats.map((k) => (
              <div
                key={k}
                className="rounded-xl border border-border bg-card/60 px-4 py-5 text-center"
              >
                <p className="text-2xl md:text-3xl font-black tabular-nums text-primary">{proof[k]}</p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {LABELS[k]}
                </p>
              </div>
            ))}
          </div>
        )}

        {proof.video_url && (
          <div className="mt-8 max-w-2xl mx-auto">
            {embed ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  src={embed}
                  title="Summit"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={proof.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border bg-card/60 px-5 py-4 text-center text-sm font-semibold text-primary hover:border-primary/40 transition-colors"
              >
                Watch the video
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
