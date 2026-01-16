import { useState } from "react";
import { DollarSign, TrendingUp, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const ROOKIE_BRACKETS = [
  { min: 0, max: 69999, rate: 0.18 },
  { min: 70000, max: 99999, rate: 0.22 },
  { min: 100000, max: 149999, rate: 0.25 },
  { min: 150000, max: 199999, rate: 0.35 },
  { min: 200000, max: 249999, rate: 0.40 },
  { min: 250000, max: 299999, rate: 0.45 },
  { min: 300000, max: 399999, rate: 0.50 },
  { min: 400000, max: Infinity, rate: 0.55 },
];

const getCommissionRate = (revenue: number): number => {
  const bracket = ROOKIE_BRACKETS.find(b => revenue >= b.min && revenue <= b.max);
  return bracket ? bracket.rate : 0.18;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const RookieCalculator = () => {
  const [revenue, setRevenue] = useState(170000);

  const rate = getCommissionRate(revenue);
  const earnings = revenue * rate;

  const presetValues = [
    { label: "Low: $70k", value: 70000 },
    { label: "Average: $170k", value: 170000 },
    { label: "High: $350k", value: 350000 },
  ];

  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Earnings Calculator</h3>
          <p className="text-sm text-muted-foreground">Estimate your summer earnings</p>
        </div>
      </div>

      {/* Disclaimer at top */}
      <p className="text-xs text-muted-foreground mb-6">
        This is a four-month summer opportunity. Your exact results depend on performance and cancellations; this is an estimate tool.
      </p>

      {/* Revenue Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Serviced Revenue Goal
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {presetValues.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setRevenue(preset.value)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                revenue === preset.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <Slider
          value={[revenue]}
          onValueChange={(value) => setRevenue(value[0])}
          min={70000}
          max={350000}
          step={5000}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$70,000</span>
          <span>$350,000</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Revenue Goal</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(revenue)}</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Commission Rate</p>
          <p className="text-xl font-bold text-primary">{(rate * 100).toFixed(0)}%</p>
        </div>
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">Estimated Earnings</p>
          </div>
          <p className="text-xl font-bold text-success">{formatCurrency(earnings)}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground mb-6">
        Estimates shown are for simple planning and do not account for cancellations, taxes, chargebacks, bonuses, or local market differences.
      </p>

      {/* Housing Notes */}
      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Home className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Housing Notes</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            At $100,000 serviced revenue, summer housing rent is waived.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            If $100,000 is not serviced, rent may be deducted from January backend.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            If a rep does not complete a minimum of 3 weeks of work, $2,500 is owed in housing cost.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RookieCalculator;
