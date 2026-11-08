import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setPageMeta } from '@/lib/pageMeta';
import './IndustryPage.css';

// Life is not open publicly yet, so /industries/life sends people home.
const SLUGS: Record<string, string> = { pest: 'Pest', fiber: 'Fiber' };

interface IndustryData {
  vertical: string;
  label: string;
  description: string | null;
  public_note: string | null;
  how_it_works: string[];
  ranks: { name: string; value: number | null }[];
  leads: { full_name: string | null; avatar_url: string | null; intro: string | null }[];
}

export default function IndustryPage() {
  const { slug = '' } = useParams();
  const isLife = slug.toLowerCase() === 'life';
  const vertical = SLUGS[slug.toLowerCase()];
  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);
  const isPest = vertical === 'Pest';
  const steps = data?.how_it_works || [];
  const carriers = data && 'carriers' in data && Array.isArray(data.carriers)
    ? data.carriers.filter((carrier): carrier is string => typeof carrier === 'string')
    : [];

  useEffect(() => {
    if (!vertical) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: res } = await (supabase as any).rpc('get_public_industry', { p_vertical: vertical });
      setData(res || null);
      setLoading(false);
      setPageMeta({
        title: `${res?.label || vertical} - Trinity Sales`,
        description:
          res?.description ||
          'We train and field sales reps in pest control and fiber internet.',
        path: `/industries/${slug.toLowerCase()}`,
      });

    })();
  }, [vertical, slug]);

  if (isLife) {
    return (
      <div className="gold-world min-h-screen bg-background flex flex-col">
        <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-8 sm:px-6">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
          <p className="micro-label text-primary">Life insurance</p>
          <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-foreground">Trinity Life</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Life insurance. One of our three industries, alongside pest control and fiber internet.
            Requires a state license to sell.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Leave your details and a manager will walk you through the licensing step.
          </p>
          <Link
            to="/apply/rookie?vertical=Life"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Apply <ArrowRight className="w-4 h-4" />
          </Link>
        </main>
      </div>
    );
  }


  if (!vertical) {
    return (
      <div className="gold-world min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground text-sm">That industry page doesn’t exist.</p>
        <Link to="/" className="micro-label text-primary">Back home</Link>
      </div>
    );
  }

  return (
    <div className="gold-world industry-page min-h-screen bg-background flex flex-col relative">
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-5 pb-20 pt-8 sm:px-6">
        <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back home
        </Link>

        <h1 className="industry-label text-foreground mb-8">
          {isPest ? 'Pest control' : data?.label || vertical}
        </h1>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading</p>
        ) : (
          <div className="space-y-8">
            {isPest && (
              <section>
                <div className="industry-earnings">
                  <div>
                    <strong className="industry-earnings-number">$200,000+</strong>
                    <p className="industry-earnings-label">Top rookie, last summer</p>
                  </div>
                  <div>
                    <strong className="industry-earnings-number">$37,000</strong>
                    <p className="industry-earnings-label">Average rookie, last summer</p>
                  </div>
                </div>
                <p className="mt-6 text-base text-foreground">Four months.</p>
              </section>
            )}

            {data?.description && (
              <p className="max-w-2xl text-base text-muted-foreground whitespace-pre-line">
                {data.description}
              </p>
            )}

            {!isPest && data?.public_note && (
              <p className="max-w-2xl text-sm text-muted-foreground">{data.public_note}</p>
            )}

            {!isPest && steps.length > 0 && <section>
              <h2 className="mb-3 text-sm font-semibold text-text-muted">How it works</h2>
              <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 sm:gap-3">
                    <span className="inline-flex min-h-11 items-center text-sm text-foreground">
                      {s}
                    </span>
                    {i < steps.length - 1 && <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-muted-foreground" />}
                  </li>
                ))}
              </ol>
            </section>}

            {!isPest && carriers.length > 0 && (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
                {carriers.map(carrier => <li key={carrier}>{carrier}</li>)}
              </ul>
            )}

            <section className="pt-2">
              <Link
                to={`/apply/rookie?vertical=${vertical}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Apply <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Sold before?{' '}
                <Link to={`/apply/veteran?vertical=${vertical}`} className="inline-flex min-h-11 items-center text-primary hover:underline">
                  Veteran application
                </Link>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
