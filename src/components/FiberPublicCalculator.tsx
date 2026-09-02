import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/commission";
import { usePublicCalc, chipsFor, fiberDefaults, type PublicCalc } from "@/hooks/usePublicCalc";

/**
 * Public fiber calculator: installs per week x weeks x starting per-install rate.
 * The rate comes from the admin setting `public_fiber_starting_rate`. It never reads the
 * internal rank stack tables. While the rate is blank, only install counts are shown.
 */
export default function FiberPublicCalculator({ calcData }: { calcData?: PublicCalc | null }) {
  const fetched = usePublicCalc();
  const calc = calcData ?? fetched;
  const d = useMemo(() => fiberDefaults(calc), [calc]);
  const chips = chipsFor(calc, "Fiber");

  const [installsPerWeek, setInstallsPerWeek] = useState(10);
  const [weeks, setWeeks] = useState(d.weeks);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (!calc || initialised) return;
    setWeeks(d.weeks);
    setInitialised(true);
  }, [calc, initialised, d.weeks]);

  const installs = installsPerWeek * weeks;
  const rate = d.startingRate;
  const seasonEarnings = rate !== null ? installs * rate : null;

  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Earnings Calculator</h3>
          <p className="text-sm text-muted-foreground">
            Installs per week, weeks worked, and the starting per-install rate
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-sm font-bold tracking-wide text-foreground">
            Installs per week
          </label>
          <span className="text-2xl font-extrabold tabular-nums text-foreground">
            {installsPerWeek}
          </span>
        </div>
        <Slider
          value={[installsPerWeek]}
          onValueChange={(v) => setInstallsPerWeek(v[0])}
          min={1}
          max={40}
          step={1}
        />
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.value}
                onClick={() => setInstallsPerWeek(c.value)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold tabular-nums transition-colors ${
                  installsPerWeek === c.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label ? `${c.label} · ${c.value}` : c.value}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-sm font-bold tracking-wide text-foreground">
            Weeks worked
          </label>
          <span className="text-2xl font-extrabold tabular-nums text-foreground">{weeks}</span>
        </div>
        <Slider
          value={[weeks]}
          onValueChange={(v) => setWeeks(v[0])}
          min={d.minWeeks}
          max={d.maxWeeks}
          step={1}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{d.minWeeks}</span>
          <span>{d.maxWeeks}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Installs per week
          </p>
          <p className="text-xl font-bold tabular-nums text-foreground">{installsPerWeek}</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Installs, season
          </p>
          <p className="text-xl font-bold tabular-nums text-foreground">{installs}</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Season earnings
          </p>
          <p className="text-xl font-bold tabular-nums text-primary">
            {seasonEarnings !== null ? formatCurrency(seasonEarnings) : ", "}
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {rate !== null ? (
          <>
            {installsPerWeek} installs × {weeks} weeks at {formatCurrency(rate)} per install. Per-install
            pay rises with rank.
          </>
        ) : (
          <>Per-install rate shared when you apply. Per-install pay rises with rank.</>
        )}
      </p>
      <p className="mt-2 text-center text-xs font-semibold text-foreground">
        This is math, not a promise.
      </p>
    </div>
  );
}
