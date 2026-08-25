import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { FiberEarningsPanel } from "@/components/FiberEarningsPanel";
import {
  getRate,
  getTier,
  getTiers,
  formatCurrency,
  formatRate,
  type PayScale,
} from "@/lib/commission";

/**
 * Accounts-based earnings calculator.
 *
 * Assumptions and where they come from:
 * - Commission rates: the existing pay scale tables in src/lib/commission.ts
 *   (rookie and veteran pest scales).
 * - Average annual contract value: admin setting `calc_avg_contract_value`.
 *   Shows "Not set" until the owner enters it — no number is assumed.
 * - Weeks worked default: admin setting `calc_default_weeks`.
 * - Accounts per week default: admin setting `calc_default_accounts_per_week`.
 * - Attrition applied to earnings: 25%, carried over from the earlier
 *   calculator version in git history.
 */
const ATTRITION = 0.25;
const FALLBACK_ACCOUNTS_PER_WEEK = 5;
const FALLBACK_WEEKS = 14;

interface EarningsCalculatorProps {
  onApplyClick?: () => void;
  /** Lock the calculator to a single pay scale (hides the toggle). */
  lockScale?: Exclude<PayScale, "marketing">;
}

const EarningsCalculator = ({ onApplyClick, lockScale }: EarningsCalculatorProps) => {
  const [industry, setIndustry] = useState<"pest" | "fiber">("pest");
  const [scale, setScale] = useState<Exclude<PayScale, "marketing">>(lockScale ?? "rookie");
  const [accountsPerWeek, setAccountsPerWeek] = useState(FALLBACK_ACCOUNTS_PER_WEEK);
  const [weeks, setWeeks] = useState(FALLBACK_WEEKS);
  const [contractValue, setContractValue] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "calc_avg_contract_value",
          "calc_default_accounts_per_week",
          "calc_default_weeks",
        ]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => {
        map[r.key] = r.value;
      });
      const acv = Number(map["calc_avg_contract_value"]);
      if (Number.isFinite(acv) && acv > 0) setContractValue(acv);
      const apw = Number(map["calc_default_accounts_per_week"]);
      if (Number.isFinite(apw) && apw > 0) setAccountsPerWeek(Math.round(apw));
      const wks = Number(map["calc_default_weeks"]);
      if (Number.isFinite(wks) && wks > 0) setWeeks(Math.round(wks));
    })();
  }, []);

  const accounts = accountsPerWeek * weeks;
  const revenue = contractValue ? accounts * contractValue : 0;
  const rate = getRate(scale, revenue);
  const tier = getTier(scale, revenue);
  const seasonEarnings = revenue * (1 - ATTRITION) * rate;
  const weeklyEarnings = weeks > 0 ? seasonEarnings / weeks : 0;
  const hasContractValue = contractValue !== null;

  return (
    <div className="space-y-8">
      <div className="card-elevated p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Earnings Calculator</h3>
            <p className="text-sm text-muted-foreground">
              {industry === "pest"
                ? "Accounts per week, weeks worked, and what the pay scale does with it"
                : "Installs per week, weeks worked, and what the carrier pays per install"}
            </p>
          </div>
        </div>

        {/* Industry toggle */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center rounded-[var(--radius)] border border-border/50 bg-card/50 p-1">
            {(["pest", "fiber"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setIndustry(i)}
                className={`min-h-11 rounded-xl px-5 text-sm font-bold uppercase tracking-wider transition-all ${industry === i ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
              >
                {i === "pest" ? "Pest" : "Fiber"}
              </button>
            ))}
          </div>
        </div>

        {industry === "fiber" && <FiberEarningsPanel />}

        {industry === "pest" && (
        <>
        {/* Pay scale toggle */}
        {!lockScale && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center rounded-[var(--radius)] border border-border/50 bg-card/50 p-1">
              {(["rookie", "veteran"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`min-h-11 rounded-xl px-5 text-sm font-bold uppercase tracking-wider transition-all ${scale === s ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "rookie" ? "Rookie" : "Veteran"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accounts per week */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-bold uppercase tracking-wide text-foreground">
              Accounts per week
            </label>
            <span className="text-2xl font-extrabold tabular-nums text-foreground">{accountsPerWeek}</span>
          </div>
          <Slider
            value={[accountsPerWeek]}
            onValueChange={(v) => setAccountsPerWeek(v[0])}
            min={1}
            max={40}
            step={1}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>40</span>
          </div>
        </div>

        {/* Weeks worked */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-bold uppercase tracking-wide text-foreground">Weeks worked</label>
            <span className="text-2xl font-extrabold tabular-nums text-foreground">{weeks}</span>
          </div>
          <Slider value={[weeks]} onValueChange={(v) => setWeeks(v[0])} min={1} max={30} step={1} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>30</span>
          </div>
        </div>

        {/* Live math */}
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Accounts, season</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{accounts}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Serviced revenue</p>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {hasContractValue ? formatCurrency(revenue) : "Not set"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Pay scale tier</p>
            <p className="text-xl font-bold tabular-nums text-primary">
              {hasContractValue ? formatRate(rate) : "Not set"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="p-5 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Weekly earnings</p>
            <p className="text-2xl font-black tabular-nums text-foreground">
              {hasContractValue ? formatCurrency(weeklyEarnings) : "Not set"}
            </p>
          </div>
          <div className="p-5 rounded-lg bg-success/20 border-2 border-success">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-success" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Season earnings</p>
            </div>
            <p className="text-3xl font-black tabular-nums text-success">
              {hasContractValue ? formatCurrency(seasonEarnings) : "Not set"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2 text-center">
          {hasContractValue ? (
            <>
              {accountsPerWeek} accounts × {weeks} weeks = {accounts} accounts, at{" "}
              {formatCurrency(contractValue!)} average annual contract value, minus 25% attrition for
              cancellations. That production reaches the{" "}
              {tier.max === Infinity
                ? `${formatCurrency(tier.min)}+`
                : `${formatCurrency(tier.min)}–${formatCurrency(tier.max)}`}{" "}
              tier at {formatRate(rate)}.
            </>
          ) : (
            <>Average annual contract value is not set yet, so earnings cannot be calculated.</>
          )}
        </p>
        <p className="text-xs font-semibold text-foreground mb-8 text-center">This is math, not a promise.</p>

        {/* Pay scale table */}
        <div className="mb-8">
          <h4 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
            {scale === "rookie" ? "Rookie" : "Veteran"} Commission Pay Scale
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {getTiers(scale).map((bracket, index) => {
              const active = hasContractValue && revenue >= bracket.min && revenue <= bracket.max;
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-center ${active ? "bg-primary/20 border-2 border-primary" : "bg-secondary/30 border border-border"}`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {bracket.max === Infinity
                      ? `$${(bracket.min / 1000).toFixed(0)}k+`
                      : `$${(bracket.min / 1000).toFixed(0)}k–$${(bracket.max / 1000).toFixed(0)}k`}
                  </p>
                  <p className={`text-lg font-bold ${active ? "text-primary" : "text-foreground"}`}>
                    {(bracket.rate * 100).toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Housing Note */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-5 h-5 text-primary" />
            <p className="text-sm font-bold text-foreground uppercase tracking-wide">Housing Note</p>
          </div>
          <p className="text-sm text-muted-foreground">
            At $100,000 in serviced revenue, summer housing is <span className="text-success font-bold">free</span>.
          </p>
        </div>

        </>
        )}

        {onApplyClick && (
          <button
            onClick={onApplyClick}
            className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-wide"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};

export default EarningsCalculator;
