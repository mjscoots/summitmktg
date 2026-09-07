import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { PublicProofStrip } from "@/components/recruiting/LiveCounters";
import ThreeDoorSection from "@/components/recruiting/ThreeDoorSection";
import { supabase } from "@/integrations/supabase/client";
import { usePublicCalc } from "@/hooks/usePublicCalc";
import { Button } from "@/components/ui/button";
const PATH_STEPS = [
  { title: "Rep", line: "Learn the work and build consistency in the field." },
  { title: "Team lead", line: "Help a small group prepare and stay accountable." },
  { title: "Manager", line: "Recruit, train and run a team." },
  { title: "Pillar with ownership", line: "Build an organization and take responsibility for its direction." },
];

/** Public front door: a focused, high-contrast cover for Summit. */
const Index = () => {
  const calc = usePublicCalc();
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await (supabase as any).rpc('get_public_cover_content');
      if (alive) setHeroImage(typeof data?.cover_hero_image === 'string' ? data.cover_hero_image : '');
    })();
    return () => { alive = false; };
  }, []);

  const hasPublishedBands = Boolean(calc?.pay_scale?.bands?.length);

  return (
    <div className="gold-world public-world min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" aria-label="Summit home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={36} />
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Link to="/industries/pest" className="hidden min-h-11 items-center px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:inline-flex sm:px-3">
              Pest
            </Link>
            <Link to="/industries/fiber" className="hidden min-h-11 items-center px-2.5 text-sm text-text-secondary transition-colors hover:text-foreground sm:inline-flex sm:px-3">
              Fiber
            </Link>
            <Button asChild variant="link" className="min-h-11 whitespace-nowrap px-3 text-foreground">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="px-5 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="aspect-[4/3] w-full overflow-hidden rounded bg-card md:aspect-[16/7]">
              {heroImage && <img src={heroImage} alt="Summit team in the field" className="h-full w-full object-cover" />}
            </div>
            <div className="mt-10 max-w-5xl md:mt-12">
              <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-7xl">
                Sell pest in the summer. Sell fiber in the fall. Never sit out a season.
              </h1>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg" className="min-h-12 px-8"><Link to="/apply/rookie">Apply</Link></Button>
                {hasPublishedBands && (
                  <Link to="/recruiting#earnings" className="inline-flex min-h-12 items-center text-sm font-semibold text-foreground underline-offset-4 hover:underline">
                    See what you could make
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <PublicProofStrip />
        <ThreeDoorSection />
        <section className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Where this goes</h2>
            <div className="mt-10 grid gap-8 md:mt-12 md:grid-cols-2 md:gap-12">
              {PATH_STEPS.map((step) => (
                <article key={step.title} className="bg-card p-5">
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-text-secondary">{step.line}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};

export default Index;
