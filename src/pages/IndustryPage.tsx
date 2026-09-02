import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { supabase } from '@/integrations/supabase/client';
import { setPageMeta } from '@/lib/pageMeta';

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

const STEPS = ['Apply', 'Setup steps', 'Pick your manager', 'Start'];

const CARD = 'public-card p-5 sm:p-6';

export default function IndustryPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const isLife = slug.toLowerCase() === 'life';
  const vertical = SLUGS[slug.toLowerCase()];
  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);
  const steps = data?.how_it_works?.length ? data.how_it_works : STEPS;

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
        title: `${res?.label || vertical} - Summit Marketing`,
        description:
          res?.description ||
          'We train and field sales reps in pest control and fiber internet. You close, you get paid on what you close.',
        path: `/industries/${slug.toLowerCase()}`,
      });
    })();
  }, [vertical, slug]);

  if (isLife) {
    return (
      <div className="gold-world public-dots min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/[0.88] backdrop-blur">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3 sm:px-6">
            <Link to="/" aria-label="Summit home" className="flex min-h-11 items-center">
              <Wordmark variant="compact" height={34} />
            </Link>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </button>
          </nav>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-8 sm:px-6">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
          <p className="micro-label text-primary">Coming soon</p>
          <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-foreground">Summit Life</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Life insurance. The career product for reps who want off the doors. Requires a state
            license to sell.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            This path is still being set up. Leave your details and we will reach out when it opens.
          </p>
          <Link
            to="/apply/rookie?vertical=Life"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tell me when <ArrowRight className="w-4 h-4" />
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
    <div className="gold-world public-dots min-h-screen bg-background flex flex-col relative">
      <header className="sticky top-0 z-30 border-b border-border bg-background/[0.88] backdrop-blur">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" aria-label="Summit home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={34} />
          </Link>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            <LogIn className="w-4 h-4" /> Sign in
          </button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-5 pb-20 pt-8 sm:px-6">
        <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back home
        </Link>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
          {data?.label || vertical}
        </h1>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading</p>
        ) : (
          <div className="space-y-10">
            {data?.public_note && (
              <p className="max-w-2xl text-sm text-muted-foreground">{data.public_note}</p>
            )}

            {data?.description && (
              <p className="max-w-2xl text-base md:text-lg text-muted-foreground whitespace-pre-line">
                {data.description}
              </p>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-text-muted">How it works</h2>
              <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 sm:gap-3">
                    <span className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm text-foreground">
                      {s}
                    </span>
                    {i < steps.length - 1 && <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-muted-foreground" />}
                  </li>
                ))}
              </ol>
            </section>

            {data?.ranks?.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-text-muted">The ladder</h2>
                <div className={CARD}>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {data.ranks.map((r, i) => (
                      <span key={r.name} className="flex items-center gap-3">
                        <span className="text-sm text-foreground">
                          {r.name}
                          {r.value != null && (
                            <span className="text-primary tabular-nums"> · ${Number(r.value).toLocaleString()}</span>
                          )}
                        </span>
                        {i < data.ranks.length - 1 && <span className="text-muted-foreground/50">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {data?.leads?.length ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-text-muted">
                  {data.leads.length > 1 ? 'Leads' : 'Lead'}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.leads.map((l, idx) => (
                    <div key={idx} className={CARD}>
                      <div className="flex items-center gap-3">
                        {l.avatar_url ? (
                          <img loading="lazy" decoding="async" width={44} height={44} src={l.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-full border border-border-strong" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{l.full_name || ''}</p>
                          {l.intro && <p className="text-xs text-muted-foreground">{l.intro}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

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
