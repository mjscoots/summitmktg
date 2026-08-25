import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { ROOKIE_TIERS, getRate, formatCurrency } from "@/lib/commission";

/** Days knocked per week and weeks in a summer season — the basis for the math. */
const DAYS_PER_WEEK = 5;
const WEEKS = 14;
/** Conservative attrition applied to earnings (not to the rate). */
const ATTRITION = 0.25;
/** Fallback average annual contract value; owner can override in app_settings. */
const DEFAULT_CONTRACT_VALUE = 550;

interface RookieCalculatorProps {
  onApplyClick?: () => void;
}

const RookieCalculator = ({ onApplyClick }: RookieCalculatorProps) => {
  const [doorsPerDay, setDoorsPerDay] = useState(80);
  const [closeRate, setCloseRate] = useState(2.5);
  const [contractValue, setContractValue] = useState(DEFAULT_CONTRACT_VALUE);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "calc_avg_contract_value")
        .maybeSingle();
      const parsed = Number(data?.value);
      if (Number.isFinite(parsed) && parsed > 0) setContractValue(parsed);
    })();
  }, []);

  const accountsPerDay = doorsPerDay * (closeRate / 100);
  const accounts = accountsPerDay * DAYS_PER_WEEK * WEEKS;
  const revenue = accounts * contractValue;
  const rate = getRate("rookie", revenue);
  const earnings = revenue * (1 - ATTRITION) * rate;

  return (
    <div className="space-y-8">
      <div className="card-elevated p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Earnings Calculator</h3>
            <p className="text-sm text-muted-foreground">Doors knocked, close rate, and what the pay scale does with it</p>
          </div>
        </div>

        {/* Doors per day */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-bold uppercase tracking-wide text-foreground">Doors per day</label>
            <span className="text-2xl font-extrabold tabular-nums text-foreground">{doorsPerDay}</span>
          </div>
          <Slider value={[doorsPerDay]} onValueChange={(v) => setDoorsPerDay(v[0])} min={20} max={150} step={5} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>20</span>
            <span>150</span>
          </div>
        </div>

        {/* Close rate */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-bold uppercase tracking-wide text-foreground">Close rate</label>
            <span className="text-2xl font-extrabold tabular-nums text-foreground">{closeRate.toFixed(1)}%</span>
          </div>
          <Slider value={[closeRate]} onValueChange={(v) => setCloseRate(v[0])} min={0.5} max={8} step={0.1} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>0.5%</span>
            <span>8%</span>
          </div>
        </div>

        {/* Live math */}
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Accounts, summer</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{Math.round(accounts)}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Serviced revenue</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(revenue)}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Commission rate</p>
            <p className="text-xl font-bold tabular-nums text-primary">{(rate * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-success/20 border-2 border-success mb-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-success" />
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Estimated earnings</p>
          </div>
          <p className="text-4xl font-black tabular-nums text-success">{formatCurrency(earnings)}</p>
        </div>

        <p className="text-xs text-muted-foreground mb-2 text-center">
          {doorsPerDay} doors × {closeRate.toFixed(1)}% × {DAYS_PER_WEEK} days × {WEEKS} weeks ={" "}
          {Math.round(accounts)} accounts, at {formatCurrency(contractValue)} average annual contract value, minus 25%
          attrition for cancellations.
        </p>
        <p className="text-xs font-semibold text-foreground mb-8 text-center">This is math, not a promise.</p>

        {/* Rookie Pay Scale */}
        <div className="mb-8">
          <h4 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
            Rookie Commission Pay Scale
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ROOKIE_TIERS.map((bracket, index) => {
              const active = revenue >= bracket.min && revenue <= bracket.max;
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
            At $100,000 in serviced revenue, summer housing is <span className="text-success font-bold">FREE</span>.
          </p>
        </div>

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

export default RookieCalculator;
