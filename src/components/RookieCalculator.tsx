import { useState } from "react";
import { DollarSign, TrendingUp, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    maximumFractionDigits: 0
  }).format(value);
};

interface RookieCalculatorProps {
  onApplyClick?: () => void;
}

const RookieCalculator = ({ onApplyClick }: RookieCalculatorProps) => {
  const [revenue, setRevenue] = useState(250000);

  const rate = getCommissionRate(revenue);

  // More conservative: 25% attrition (was 20%)
  const attritionRate = 0.25;
  const adjustedRevenue = revenue * (1 - attritionRate);
  const earnings = adjustedRevenue * rate;

  const tierMarkers = [
    { value: 70000, label: "LOW", description: "Entry-level goal. Good for testing the waters." },
    { value: 170000, label: "AVERAGE", description: "Average rookie finishes around $170k in serviced revenue." },
    { value: 350000, label: "HIGH", description: "Top performers hit $350k+. Takes serious effort." },
  ];

  const getSliderPosition = (value: number) => (value / 500000) * 100;

  return (
    <div className="space-y-8">
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

        {/* Revenue Slider */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-foreground mb-4 text-center uppercase tracking-wide">
            Your Revenue Goal
          </label>
          <div className="text-center mb-6">
            <span className="text-3xl font-extrabold text-foreground">{formatCurrency(revenue)}</span>
          </div>
          <div className="relative mb-8">
            <Slider value={[revenue]} onValueChange={value => setRevenue(value[0])} min={0} max={500000} step={5000} className="mb-4" />
            <TooltipProvider>
              <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '20px' }}>
                {tierMarkers.map(marker => (
                  <Tooltip key={marker.value}>
                    <TooltipTrigger asChild>
                      <div className="absolute -translate-x-1/2 pointer-events-auto cursor-pointer" style={{ left: `${getSliderPosition(marker.value)}%`, top: '-8px' }}>
                        <div className="w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="font-bold">{marker.label}</p>
                      <p className="text-xs">{marker.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <div className="flex justify-between text-xs text-muted-foreground mt-6">
              <span>$0</span>
              <TooltipProvider>
                {tierMarkers.map(marker => (
                  <Tooltip key={marker.value}>
                    <TooltipTrigger asChild>
                      <span className="absolute -translate-x-1/2 text-primary font-semibold cursor-pointer hover:text-primary/80" style={{ left: `${getSliderPosition(marker.value)}%` }}>
                        {marker.label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{marker.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              <span>$500,000</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wide">Commission Rate</p>
            <p className="text-2xl font-bold text-primary">{(rate * 100).toFixed(0)}%</p>
          </div>
          <div className="p-6 rounded-lg bg-success/20 border-2 border-success">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-success" />
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Estimated Earnings</p>
            </div>
            <p className="text-4xl font-black text-success">{formatCurrency(earnings)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-8 text-center">
          Sales reps are paid on revenue that lasts the full summer, not what cancels. Your commission rate is not affected—only your earnings. Earnings estimates include a conservative 25% attrition to account for cancellations and fallout.
        </p>

        {/* Rookie Pay Scale */}
        <div className="mb-8">
          <h4 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
            Rookie Commission Pay Scale
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ROOKIE_BRACKETS.map((bracket, index) => (
              <div key={index} className={`p-3 rounded-lg text-center ${revenue >= bracket.min && revenue <= bracket.max ? 'bg-primary/20 border-2 border-primary' : 'bg-secondary/30 border border-border'}`}>
                <p className="text-xs text-muted-foreground mb-1">
                  {bracket.max === Infinity ? `$${(bracket.min / 1000).toFixed(0)}k+` : `$${(bracket.min / 1000).toFixed(0)}k–$${(bracket.max / 1000).toFixed(0)}k`}
                </p>
                <p className={`text-lg font-bold ${revenue >= bracket.min && revenue <= bracket.max ? 'text-primary' : 'text-foreground'}`}>
                  {(bracket.rate * 100).toFixed(0)}%
                </p>
              </div>
            ))}
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
          <button onClick={onApplyClick} className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-wide">
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};

export default RookieCalculator;
