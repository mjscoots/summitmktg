import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { setPageMeta } from '@/lib/pageMeta';

export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export const LEGAL_ENTITY = 'Trinity Marketing LLC';
export const LEGAL_CONTACT = 'admin@trntysales.com';

/**
 * Shared layout for /privacy and /terms. Both documents are drafts until
 * reviewed by counsel, and say so at the top of the page.
 */
export default function LegalDoc({
  title,
  path,
  description,
  updated,
  intro,
  sections,
}: {
  title: string;
  path: string;
  description: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  useEffect(() => {
    setPageMeta({ title: `${title} - Trinity Sales`, description, path });
  }, [title, description, path]);

  return (
    <div className="gold-world min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div
          role="note"
          className="mb-8 rounded-lg border border-dashed border-border bg-card p-4 text-sm font-semibold text-foreground"
        >
          Draft, pending legal review.
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{updated}</p>
        <p className="mt-6 text-base text-muted-foreground">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold text-foreground">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Questions:{' '}
          <a href={`mailto:${LEGAL_CONTACT}`} className="font-semibold text-primary hover:underline">
            {LEGAL_CONTACT}
          </a>
        </p>
        <p className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="inline-flex min-h-11 items-center text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="inline-flex min-h-11 items-center text-primary hover:underline">
            Terms of Use
          </Link>
        </p>
      </main>
    </div>
  );
}
