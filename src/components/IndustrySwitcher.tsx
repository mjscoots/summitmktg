import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicCalc } from "@/hooks/usePublicCalc";

const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));
const FiberPublicCalculator = lazy(() => import("@/components/FiberPublicCalculator"));

const TABS = [
  { slug: "pest", vertical: "Pest", label: "Pest" },
  { slug: "fiber", vertical: "Fiber", label: "Fiber" },
  { slug: "life", vertical: "Life", label: "Life" },
] as const;

type Slug = (typeof TABS)[number]["slug"];

interface IndustryData {
  vertical: string;
  label: string;
  description: string | null;
  public_note: string | null;
  how_it_works: string[];
  ranks: { name: string; value: number | null }[];
  leads: { full_name: string | null; avatar_url: string | null; intro: string | null }[];
}

const DEFAULT_STEPS = ["Apply", "Setup steps", "Pick your manager", "Start"];
const CARD = "rounded-2xl border border-primary/20 bg-white/[0.02] p-5 sm:p-6";

function hashSlug(): Slug | null {
  const h = window.location.hash.replace("#", "").toLowerCase();
  return TABS.some((t) => t.slug === h) ? (h as Slug) : null;
}

/**
 * Landing-page industry toggle. Swaps the description, how-it-works lines, calculator,
 * lead card and Apply target in place. Pulls the same content blocks the /industries/*
 * pages use, so there is one place to edit.
 */
export default function IndustrySwitcher() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<Slug>(() => hashSlug() ?? "pest");
  const [content, setContent] = useState<Record<string, IndustryData | null>>({});
  const calc = usePublicCalc();

  useEffect(() => {
    const onHash = () => {
      const h = hashSlug();
      if (h) setSlug(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.all(
        TABS.map((t) => (supabase as any).rpc("get_public_industry", { p_vertical: t.vertical })),
      );
      if (!alive) return;
      const map: Record<string, IndustryData | null> = {};
      TABS.forEach((t, i) => {
        map[t.slug] = (results[i]?.data as IndustryData) ?? null;
      });
      setContent(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tab = TABS.find((t) => t.slug === slug)!;
  const data = content[slug] ?? null;
  const steps = data?.how_it_works?.length ? data.how_it_works : DEFAULT_STEPS;
  const applyHref = `/apply/rookie?vertical=${tab.vertical}`;

  const select = (s: Slug) => {
    setSlug(s);
    if (window.location.hash !== `#${s}`) {
      window.history.replaceState(null, "", `#${s}`);
    }
  };

  return (
    <section id="industries" className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12 scroll-mt-8">
      <h2 className="mb-6 text-center text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
        Pick your industry
      </h2>

      <div className="mb-8 flex justify-center">
        <div
          role="tablist"
          aria-label="Industry"
          className="inline-flex items-center rounded-2xl border border-primary/25 bg-white/[0.02] p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.slug}
              role="tab"
              aria-selected={slug === t.slug}
              onClick={() => select(t.slug)}
              className={`min-h-11 rounded-xl px-5 text-sm font-bold uppercase tracking-wider transition-colors ${
                slug === t.slug
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {data?.description && (
          <p className="mx-auto max-w-2xl whitespace-pre-line text-center text-base text-muted-foreground md:text-lg">
            {data.description}
          </p>
        )}
        {data?.public_note && (
          <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
            {data.public_note}
          </p>
        )}

        {slug !== "life" && (
          <div>
            <h3 className="micro-label mb-3 text-muted-foreground">How it works</h3>
            <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {steps.map((s, i) => (
                <li key={`${s}-${i}`} className="flex items-center gap-2 sm:gap-3">
                  <span className="rounded-xl border border-primary/25 bg-white/[0.02] px-3 py-2 text-sm text-foreground">
                    {s}
                  </span>
                  {i < steps.length - 1 && (
                    <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {slug === "fiber" && data?.ranks?.length ? (
          <div>
            <h3 className="micro-label mb-3 text-muted-foreground">The ladder</h3>
            <div className={CARD}>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {data.ranks.map((r, i) => (
                  <span key={r.name} className="flex items-center gap-3">
                    <span className="text-sm text-foreground">{r.name}</span>
                    {i < data.ranks.length - 1 && <span className="text-muted-foreground/50">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Per-install pay rises with rank.</p>
            </div>
          </div>
        ) : null}

        {data?.leads?.length ? (
          <div>
            <h3 className="micro-label mb-3 text-muted-foreground">
              {data.leads.length > 1 ? "Leads" : "Lead"}
            </h3>
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
                      <p className="truncate text-sm font-bold text-foreground">{l.full_name || ""}</p>
                      {l.intro && <p className="text-xs text-muted-foreground">{l.intro}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {slug !== "life" && (
          <div id="earnings" className="scroll-mt-8">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-[var(--radius)]" />}>
              {slug === "pest" ? (
                <EarningsCalculator calcData={calc} />
              ) : (
                <FiberPublicCalculator calcData={calc} />
              )}
            </Suspense>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate(applyHref)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:shadow-[0_10px_30px_-10px_hsl(46_65%_52%_/_0.6)]"
          >
            Apply for {tab.label} <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Full {tab.label.toLowerCase()} page:{" "}
            <a href={`/industries/${tab.slug}`} className="text-primary hover:underline">
              /industries/{tab.slug}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
