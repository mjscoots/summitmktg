import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/commission";
import {
  usePublicCalc,
  chipsFor,
  pestDefaults,
  type PayBand,
  type PublicCalc,
} from "@/hooks/usePublicCalc";
import VetBidForm from "@/components/VetBidForm";
import { PayLadderTrack } from "@/components/shared/PayLadderTrack";

/**
 * Public pest earnings calculator — rookie only.
 *
 * Where the numbers come from:
 * - Average account value: admin setting `calc_avg_contract_value`.
 * - Weeks worked default / min / max: `calc_default_weeks`, `calc_min_weeks`, `calc_max_weeks`.
 * - Accounts per week default: `calc_default_accounts_per_week`; preset chips from `public_calc_chips`.
 * - Active revenue = serviced revenue minus `calc_active_reduction_pct` for cancellations.
 * - Commission bands: the public pay scale record (2027 rookie scale), retroactive on all
 *   season active revenue.
 */
interface EarningsCalculatorProps {
  onApplyClick?: () => void;
  /** Pre-loaded payload (landing page shares one fetch across industries). */
  calcData?: PublicCalc | null;
}

function bandFor(bands: PayBand[], revenue: number): PayBand | null {
  return (
    bands.find((b) => revenue >= b.min && (b.max === null || revenue <= b.max)) ?? null
  );
}

function bandLabel(b: PayBand) {
  return b.max === null
    ? `$${(b.min / 1000).toFixed(0)}k+`
    : `$${(b.min / 1000).toFixed(0)}k–$${((b.max + 1) / 1000).toFixed(0)}k`;
}

const EarningsCalculator = ({ onApplyClick, calcData }: EarningsCalculatorProps) => {
  const fetched = usePublicCalc();
  const calc = calcData ?? fetched;
  const d = useMemo(() => pestDefaults(calc), [calc]);
  const chips = chipsFor(calc, "Pest");
  const bands = calc?.pay_scale?.bands ?? [];

  const [accountsPerWeek, setAccountsPerWeek] = useState(d.accountsPerWeek);
  const [weeks, setWeeks] = useState(d.weeks);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (!calc || initialised) return;
    setAccountsPerWeek(d.accountsPerWeek);
    setWeeks(d.weeks);
    setInitialised(true);
  }, [calc, initialised, d.accountsPerWeek, d.weeks]);

  const accounts = accountsPerWeek * weeks;
  const serviced = accounts * d.contractValue;
  const active = serviced * (1 - d.reductionPct / 100);
  const band = bandFor(bands, active);
  const rate = band?.rate ?? 0;
  const seasonEarnings = active * rate;
  const revenuePerWeek = accountsPerWeek * d.contractValue;

  /** Tapping a band sets the weekly accounts needed to reach it at the chosen weeks. */
  const jumpToBand = (b: PayBand) => {
    const perWeekActive = weeks * d.contractValue * (1 - d.reductionPct / 100);
    if (perWeekActive <= 0) return;
    const needed = Math.max(1, Math.ceil(b.min / perWeekActive));
    setAccountsPerWeek(Math.min(60, needed));
  };

  return (
    <div className="space-y-8">
      <div className="card-elevated p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Earnings calculator</h3>
            <p className="text-sm text-muted-foreground">
              Accounts per week, weeks worked, and what the pay scale does with it
            </p>
          </div>
        </div>

        {/* Accounts per week */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold text-foreground">
              Accounts per week
            </label>
            <span className="text-2xl font-extrabold tabular-nums text-foreground">
              {accountsPerWeek}
            </span>
          </div>
          <Slider
            value={[accountsPerWeek]}
            onValueChange={(v) => setAccountsPerWeek(v[0])}
            min={1}
            max={40}
            step={1}
          />
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setAccountsPerWeek(c.value)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-semibold tabular-nums transition-colors ${
                    accountsPerWeek === c.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label ? `${c.label} · ${c.value}` : c.value}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {accountsPerWeek} accounts a week = {formatCurrency(revenuePerWeek)} a week in revenue
          </p>
        </div>

        {/* Weeks worked */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold text-foreground">
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

        {/* Live math */}
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Cell label="Revenue per week" value={formatCurrency(revenuePerWeek)} />
          <Cell label="Season revenue" value={formatCurrency(serviced)} />
          <Cell label={`Active revenue (−${d.reductionPct}%)`} value={formatCurrency(active)} />
        </div>

        <div className="mb-6 p-5 rounded-lg bg-secondary border border-border">
          <p className="micro-label mb-2">Season earnings</p>
          <p className="text-3xl font-bold stat-num text-foreground">
            {formatCurrency(seasonEarnings)}
          </p>
        </div>


        <p className="text-xs text-muted-foreground mb-2 text-center">
          {accountsPerWeek} accounts × {weeks} weeks = {accounts} accounts at{" "}
          {formatCurrency(d.contractValue)} each, {formatCurrency(serviced)} serviced revenue, less{" "}
          {d.reductionPct}% for cancellations ={" "}
          {formatCurrency(active)} active revenue
          {band ? ` at ${(rate * 100).toFixed(0)}% on the whole season` : ""}.
        </p>
        <p className="text-xs font-semibold text-foreground mb-8 text-center">
          This is math, not a promise.
        </p>

        {/* Pay ladder track */}
        {bands.length > 0 && (
          <div className="mb-8">
            <h4 className="text-base font-semibold text-foreground mb-1">Pay ladder</h4>
            <p className="text-xs text-muted-foreground mb-4">
              {calc?.pay_scale?.label} — the tier you reach pays that rate on all season active
              revenue. Tap a tier to set the accounts it takes.
            </p>
            <PayLadderTrack
              tiers={bands.map((b) => ({
                label: bandLabel(b),
                rateLabel: `${(b.rate * 100).toFixed(0)}%`,
                min: b.min,
                max: b.max,
              }))}
              value={active}
              formatAmount={formatCurrency}
              onTierSelect={(_t, i) => jumpToBand(bands[i])}
            />
          </div>
        )}


        {/* Housing note */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Housing note</p>
          </div>
          <p className="text-sm text-muted-foreground">Rent is free at $125,000 active revenue.</p>
        </div>

        {onApplyClick && (
          <button
            onClick={onApplyClick}
            className="w-full min-h-11 py-4 bg-primary text-primary-foreground font-semibold text-base rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply now
          </button>
        )}

        <div className="mt-6 text-center">
          <VetBidForm />
        </div>
      </div>
    </div>
  );
};

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default EarningsCalculator;
