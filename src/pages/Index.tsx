import { useNavigate } from "react-router-dom";
import { LogIn, ArrowRight } from "lucide-react";
import summitLogo from "@/assets/summit-logo-new.png";
import { LiveCounters } from "@/components/recruiting/LiveCounters";
import IndustrySwitcher from "@/components/IndustrySwitcher";

/**
 * Public landing page.
 *
 * Above the fold on a phone: the thesis line and the industry toggle. Nothing
 * else. The calculator sits second, with the pay ladder track inside it. The
 * proof strip below shows only live counters.
 */
const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="w-full border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            aria-label="Summit Marketing home"
            className="flex min-h-11 items-center gap-2.5 text-foreground"
          >
            <img src={summitLogo} alt="" className="h-6 w-auto" />
            <span className="text-base font-semibold tracking-tight">Summit Marketing</span>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="inline-flex min-h-11 items-center gap-2 rounded border border-border px-4 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
          >
            <LogIn className="w-4 h-4" />
            Log in
          </button>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero — thesis line and the industry toggle */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-6">
          <h1 className="text-foreground">
            We train and field sales reps in pest control, fiber internet, and life insurance
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            You close, you get paid on what you close. Pest in the summer, fiber in the winter, life
            insurance year-round, and one rank that carries across all three.
          </p>
        </section>

        {/* Industry toggle, then the calculator with the pay ladder inside it */}
        <IndustrySwitcher />

        {/* Proof strip — live counters only */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <LiveCounters variant="inline" />
        </section>

        {/* Apply */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <div className="rounded border border-border bg-card p-6">
            <h2 className="text-foreground">Apply</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An application takes a few minutes. Rookie and veteran paths are both open.
            </p>
            <button
              onClick={() => navigate("/apply")}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start an application <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">© 2026 Summit Marketing</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/recruiting")}
              className="inline-flex min-h-11 items-center rounded px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Recruiting
            </button>
            <button
              onClick={() => navigate("/apply")}
              className="inline-flex min-h-11 items-center rounded px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Apply
            </button>
            <a
              href="https://www.instagram.com/summitmktgsales/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
