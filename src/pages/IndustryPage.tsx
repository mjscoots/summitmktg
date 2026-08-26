import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { supabase } from '@/integrations/supabase/client';
import { setPageMeta } from '@/lib/pageMeta';

const SLUGS: Record<string, string> = { pest: 'Pest', fiber: 'Fiber', life: 'Life' };

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

const CARD = 'rounded-2xl border border-primary/20 bg-white/[0.02] p-5 sm:p-6';

export default function IndustryPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
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
        title: `${res?.label || vertical} — Summit Trinity`,
        description:
          res?.description ||
          'We train and field sales reps in pest control, fiber internet, and life insurance. You close, you get paid on what you close.',
        path: `/industries/${slug.toLowerCase()}`,
      });
    })();
  }, [vertical, slug]);

  if (!vertical) {
    return (
      <div className="gold-world min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground text-sm">That industry page doesn’t exist.</p>
        <Link to="/" className="micro-label text-primary">Back home</Link>
      </div>
    );
  }

  return (
    <div className="gold-world min-h-screen bg-background flex flex-col relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh]"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, hsl(46 65% 52% / 0.14), transparent 65%)' }}
      />

      <nav className="relative z-20 w-full px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-foreground/80 hover:text-foreground transition-colors">
            <Wordmark variant="compact" height={28} />
            <span className="text-lg font-black tracking-tight uppercase">Summit</span>
          </Link>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/60 px-4 text-sm font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <LogIn className="w-4 h-4" /> Log in
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-6 pb-20">
        <Link to="/" className="micro-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> All industries
        </Link>

        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-4">
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
              <h2 className="micro-label text-muted-foreground mb-3">How it works</h2>
              <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 sm:gap-3">
                    <span className="rounded-xl border border-primary/25 bg-white/[0.02] px-3 py-2 text-sm text-foreground">
                      {s}
                    </span>
                    {i < steps.length - 1 && <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-muted-foreground" />}
                  </li>
                ))}
              </ol>
            </section>

            {data?.ranks?.length ? (
              <section>
                <h2 className="micro-label text-muted-foreground mb-3">The ladder</h2>
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
                <h2 className="micro-label text-muted-foreground mb-3">
                  {data.leads.length > 1 ? 'Leads' : 'Lead'}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.leads.map((l, idx) => (
                    <div key={idx} className={CARD}>
                      <div className="flex items-center gap-3">
                        {l.avatar_url ? (
                          <img src={l.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-full border border-primary/25" />
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
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:shadow-[0_10px_30px_-10px_hsl(46_65%_52%_/_0.6)]"
              >
                Apply <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Sold before?{' '}
                <Link to={`/apply/veteran?vertical=${vertical}`} className="text-primary hover:underline">
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
