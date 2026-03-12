import { useState, useEffect, useRef } from "react";
import { DollarSign, Users, TrendingUp, Calculator, User, Briefcase } from "lucide-react";

// ============= EXACT TIER TABLES =============

// Rookie commission table (based on ACTIVE serviced revenue)
const ROOKIE_COMMISSION_TIERS = [
  { min: 0, max: 69999, rate: 0.18 },
  { min: 70000, max: 99999, rate: 0.22 },
  { min: 100000, max: 149999, rate: 0.25 },
  { min: 150000, max: 199999, rate: 0.35 },
  { min: 200000, max: 249999, rate: 0.40 },
  { min: 250000, max: 299999, rate: 0.45 },
  { min: 300000, max: 399999, rate: 0.50 },
  { min: 400000, max: Infinity, rate: 0.55 },
];

// Vet commission table (based on ACTIVE revenue)
const VET_COMMISSION_TIERS = [
  { min: 0, max: 199999, rate: 0.40 },
  { min: 200000, max: 249999, rate: 0.50 },
  { min: 250000, max: 299999, rate: 0.55 },
  { min: 300000, max: 399999, rate: 0.60 },
  { min: 400000, max: 499999, rate: 0.65 },
  { min: 500000, max: Infinity, rate: 0.70 },
];

// Marketing deal table (based on TEAM ACTIVE revenue; excludes personal)
// Extended with 78% at $15M and 80% at $20M
const MARKETING_DEAL_TIERS = [
  { min: 0, max: 249999, rate: 0.45 },
  { min: 250000, max: 499999, rate: 0.50 },
  { min: 500000, max: 1249999, rate: 0.55 },
  { min: 1250000, max: 2499999, rate: 0.60 },
  { min: 2500000, max: 3749999, rate: 0.65 },
  { min: 3750000, max: 4999999, rate: 0.675 },
  { min: 5000000, max: 7499999, rate: 0.70 },
  { min: 7500000, max: 9999999, rate: 0.72 },
  { min: 10000000, max: 12499999, rate: 0.74 },
  { min: 12500000, max: 14999999, rate: 0.76 },
  { min: 15000000, max: 19999999, rate: 0.78 },
  { min: 20000000, max: Infinity, rate: 0.80 },
];

const getRookieCommissionRate = (activeRevenue: number): number => {
  const tier = ROOKIE_COMMISSION_TIERS.find(t => activeRevenue >= t.min && activeRevenue <= t.max);
  return tier ? tier.rate : 0.18;
};

const getVetCommissionRate = (activeRevenue: number): number => {
  const tier = VET_COMMISSION_TIERS.find(t => activeRevenue >= t.min && activeRevenue <= t.max);
  return tier ? tier.rate : 0.40;
};

const getMarketingDealRate = (teamActiveRevenue: number): number => {
  const tier = MARKETING_DEAL_TIERS.find(t => teamActiveRevenue >= t.min && teamActiveRevenue <= t.max);
  return tier ? tier.rate : 0.45;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const parseFormattedNumber = (value: string): number => {
  if (value === "") return 0;
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
};

const formatNumberInput = (value: string): string => {
  const cleanValue = value.replace(/[^0-9]/g, "");
  if (cleanValue === "") return "";
  const parsed = parseInt(cleanValue, 10);
  return isNaN(parsed) ? "" : parsed.toLocaleString('en-US');
};

// Animated number component
const AnimatedNumber = ({ value, prefix = "$" }: { value: number; prefix?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const current = start + (end - start) * easeOutQuart;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = end;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: prefix === "$" ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(displayValue));

  return <span>{prefix === "$" ? formattedValue : `${Math.round(displayValue).toLocaleString()}%`}</span>;
};

export interface VetCalculatorValues {
  personalGrossRevenue: number;
  numDirectRookies: number;
  numDirectVets: number;
  numDirectManagers: number;
  avgManagerTeamRevenue: number;
  avgRookiePra: number;
  avgVetPra: number;
}

interface VetCalculatorProps {
  onApplyClick?: () => void;
  onValuesChange?: (values: VetCalculatorValues) => void;
}

// Constants — more conservative projections
const ATTRITION_RATE = 0.25; // Was 20%, now 25% for more realistic estimates
const DEFAULT_AVG_ROOKIE_PRA = 150000; // Was 175k, more conservative
const DEFAULT_AVG_VET_PRA = 250000; // Was 275k, more conservative
const DEFAULT_INCENTIVES_RATE = 0.05;

const VetCalculator = ({ onApplyClick, onValuesChange }: VetCalculatorProps) => {
  // Personal Inputs
  const [personalGrossStr, setPersonalGrossStr] = useState("");
  
  // Team Inputs
  const [numDirectRookiesStr, setNumDirectRookiesStr] = useState("");
  const [avgRookiePraStr, setAvgRookiePraStr] = useState("150,000");
  const [numDirectVetsStr, setNumDirectVetsStr] = useState("");
  const [avgVetPraStr, setAvgVetPraStr] = useState("250,000");
  const [numDirectManagersStr, setNumDirectManagersStr] = useState("");
  const [avgManagerTeamRevenueStr, setAvgManagerTeamRevenueStr] = useState("");

  // Parse string values to numbers
  const personalGrossRevenue = parseFormattedNumber(personalGrossStr);
  const numDirectRookies = parseFormattedNumber(numDirectRookiesStr);
  const avgRookiePra = parseFormattedNumber(avgRookiePraStr) || DEFAULT_AVG_ROOKIE_PRA;
  const numDirectVets = parseFormattedNumber(numDirectVetsStr);
  const avgVetPra = parseFormattedNumber(avgVetPraStr) || DEFAULT_AVG_VET_PRA;
  const numDirectManagers = parseFormattedNumber(numDirectManagersStr);
  const avgManagerTeamRevenue = parseFormattedNumber(avgManagerTeamRevenueStr);
  
  // Fixed 5% incentive cost - only applies to rookie revenue
  const ROOKIE_INCENTIVES_RATE = 0.05;

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    setter(formatNumberInput(value));
  };

  const handleCountChange = (value: string, setter: (val: string) => void) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (cleanValue === "") {
      setter("");
      return;
    }
    const parsed = parseInt(cleanValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed.toString());
    }
  };

  // ============= PERSONAL MATH =============
  const personalActiveRevenue = personalGrossRevenue * (1 - ATTRITION_RATE);
  const vetCommissionRate = getVetCommissionRate(personalActiveRevenue);
  const personalEarnings = personalActiveRevenue * vetCommissionRate;

  // ============= TEAM GROSS BUILD (EXCLUDING PERSONAL) =============
  const directRookieGross = numDirectRookies * avgRookiePra;
  const directVetGross = numDirectVets * avgVetPra;
  const directManagerGross = numDirectManagers * avgVetPra;
  // Manager downline now uses direct revenue input (not reps × PRA)
  const managerDownlineGross = numDirectManagers * avgManagerTeamRevenue;
  const teamGrossRevenue = directRookieGross + directVetGross + directManagerGross + managerDownlineGross;

  // ============= TEAM ACTIVE + MARKETING DEAL =============
  const teamActiveRevenue = teamGrossRevenue * (1 - ATTRITION_RATE);
  const marketingDealRate = getMarketingDealRate(teamActiveRevenue);

  // ============= TEAM EARNINGS VIA SPREAD =============
  
  // Spread on Direct Rookies (5% incentive cost applies ONLY here)
  const avgRookieActive = avgRookiePra * (1 - ATTRITION_RATE);
  const rookieCommissionRate = getRookieCommissionRate(avgRookieActive);
  const rookieGrossSpread = marketingDealRate - rookieCommissionRate;
  const rookieNetSpread = Math.max(0, rookieGrossSpread - ROOKIE_INCENTIVES_RATE);
  const directRookieActiveTotal = directRookieGross * (1 - ATTRITION_RATE);
  const directRookieSpreadEarnings = directRookieActiveTotal * rookieNetSpread;

  // Spread on Direct Vets + Direct Managers (their personal production) - NO incentive cost
  const avgVetActive = avgVetPra * (1 - ATTRITION_RATE);
  const vetManagerCommissionRate = getVetCommissionRate(avgVetActive);
  const vetManagerGrossSpread = marketingDealRate - vetManagerCommissionRate;
  const vetManagerNetSpread = Math.max(0, vetManagerGrossSpread); // No incentive deduction
  const directVetManagerActiveTotal = (directVetGross + directManagerGross) * (1 - ATTRITION_RATE);
  const directVetManagerSpreadEarnings = directVetManagerActiveTotal * vetManagerNetSpread;

  // Spread on Managers' Teams (using direct revenue input) - NO incentive cost
  const oneManagerTeamActive = avgManagerTeamRevenue * (1 - ATTRITION_RATE);
  const managerDealRate = getMarketingDealRate(oneManagerTeamActive);
  const downlineGrossSpread = marketingDealRate - managerDealRate;
  const downlineNetSpread = Math.max(0, downlineGrossSpread); // No incentive deduction
  const oneManagerTeamSpreadEarnings = oneManagerTeamActive * downlineNetSpread;
  const totalManagerTeamSpreadEarnings = oneManagerTeamSpreadEarnings * numDirectManagers;

  // Total Team Earnings
  const teamEarnings = directRookieSpreadEarnings + directVetManagerSpreadEarnings + totalManagerTeamSpreadEarnings;

  // ============= FINAL TOTALS =============
  const totalEstimatedEarnings = personalEarnings + teamEarnings;

  // Active revenues for display
  const directRookieActive = directRookieGross * (1 - ATTRITION_RATE);
  const directVetActive = directVetGross * (1 - ATTRITION_RATE);
  const directManagerActive = directManagerGross * (1 - ATTRITION_RATE);
  const managerTeamsActive = managerDownlineGross * (1 - ATTRITION_RATE);

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        personalGrossRevenue,
        numDirectRookies,
        numDirectVets,
        numDirectManagers,
        avgManagerTeamRevenue,
        avgRookiePra,
        avgVetPra,
      });
    }
  }, [personalGrossRevenue, numDirectRookies, numDirectVets, numDirectManagers, avgManagerTeamRevenue, avgRookiePra, avgVetPra, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      {/* PERSONAL INPUTS */}
      <div className="mb-8">
        <h3 className="text-2xl font-black text-foreground uppercase tracking-wide mb-6 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] flex items-center gap-3">
          <User className="w-7 h-7 text-primary" />
          Personal Inputs
        </h3>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Personal Revenue</h4>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={personalGrossStr}
              onChange={e => handleCurrencyChange(e.target.value, setPersonalGrossStr)}
              className="input-field pl-8"
              placeholder="Example: 200,000"
            />
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-border mb-8" />

      {/* TEAM INPUTS */}
      <div className="mb-8">
        <h3 className="text-2xl font-black text-foreground uppercase tracking-wide mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] flex items-center gap-3">
          <Calculator className="w-7 h-7 text-primary" />
          Team Inputs
        </h3>
        <p className="text-xs text-muted-foreground mb-6">(Not including personal)</p>

        <div className="space-y-5">
          {/* 1. Direct Rookies */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Rookies</h4>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={numDirectRookiesStr}
              onChange={e => handleCountChange(e.target.value, setNumDirectRookiesStr)}
              className="input-field"
              placeholder="Example: 5"
            />
          </div>

          {/* Average Rookie PRA Amount */}
          <div className="ml-4 border-l-2 border-primary/30 pl-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary/70" />
              <h4 className="text-sm font-medium text-foreground/80">Average Rookie PRA Amount</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Conservative rookie average is $150,000.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={avgRookiePraStr}
                onChange={e => handleCurrencyChange(e.target.value, setAvgRookiePraStr)}
                className="input-field pl-8"
                placeholder="Example: 175,000"
              />
            </div>
          </div>

          {/* 2. Direct Vets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Vets</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Veterans with no reps.</p>
            <input
              type="text"
              inputMode="numeric"
              value={numDirectVetsStr}
              onChange={e => handleCountChange(e.target.value, setNumDirectVetsStr)}
              className="input-field"
              placeholder="Example: 2"
            />
          </div>

          {/* Average Vet PRA Amount */}
          <div className="ml-4 border-l-2 border-primary/30 pl-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary/70" />
              <h4 className="text-sm font-medium text-foreground/80">Average Vet PRA Amount</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Conservative vet average is $250,000.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={avgVetPraStr}
                onChange={e => handleCurrencyChange(e.target.value, setAvgVetPraStr)}
                className="input-field pl-8"
                placeholder="Example: 275,000"
              />
            </div>
          </div>

          {/* 3. Direct Managers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Managers</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Veterans with their own reps.</p>
            <input
              type="text"
              inputMode="numeric"
              value={numDirectManagersStr}
              onChange={e => handleCountChange(e.target.value, setNumDirectManagersStr)}
              className="input-field"
              placeholder="Example: 3"
            />
          </div>

          {/* Average Manager Team Revenue */}
          <div className="ml-4 border-l-2 border-primary/30 pl-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary/70" />
              <h4 className="text-sm font-medium text-foreground/80">Average Manager Team Revenue</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Average total revenue produced by each manager's team.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={avgManagerTeamRevenueStr}
                onChange={e => handleCurrencyChange(e.target.value, setAvgManagerTeamRevenueStr)}
                className="input-field pl-8"
                placeholder="Example: 1,000,000"
              />
            </div>
          </div>

        </div>
      </div>

      {/* CALCULATION BREAKDOWN */}
      <div className="border-t border-border pt-8">
        <h3 className="text-2xl font-black text-foreground uppercase tracking-wide mb-6 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-primary" />
          Calculation Breakdown
        </h3>

        <div className="p-5 rounded-xl bg-secondary/20 border border-border space-y-4 text-sm">
          
          {/* Personal */}
          <div className="pb-3 border-b border-border/50">
            <p className="text-primary font-bold uppercase text-xs mb-2">Personal</p>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{formatCurrency(personalGrossRevenue)} → {formatCurrency(personalActiveRevenue)} (−20%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission Rate</span>
                <span className="text-foreground">{(vetCommissionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-foreground font-medium">
                <span>Personal Earnings</span>
                <span>{formatCurrency(personalActiveRevenue)} × {(vetCommissionRate * 100).toFixed(0)}% = <span className="text-primary font-bold"><AnimatedNumber value={personalEarnings} /></span></span>
              </div>
            </div>
          </div>

          {/* Team Revenue */}
          <div className="pb-3 border-b border-border/50">
            <p className="text-primary font-bold uppercase text-xs mb-2">Team Revenue</p>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rookie Revenue</span>
                <span className="text-foreground">{formatCurrency(directRookieGross)} → {formatCurrency(directRookieActive)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vet Revenue</span>
                <span className="text-foreground">{formatCurrency(directVetGross)} → {formatCurrency(directVetActive)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manager Personal</span>
                <span className="text-foreground">{formatCurrency(directManagerGross)} → {formatCurrency(directManagerActive)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manager Teams</span>
                <span className="text-foreground">{formatCurrency(managerDownlineGross)} → {formatCurrency(managerTeamsActive)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/30 text-foreground font-medium">
                <span>Total Team Active</span>
                <span>{formatCurrency(teamActiveRevenue)}</span>
              </div>
              <div className="flex justify-between text-foreground font-medium">
                <span>Marketing Deal %</span>
                <span className="text-primary font-bold">{(marketingDealRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Spreads */}
          <div className="pb-3 border-b border-border/50">
            <p className="text-primary font-bold uppercase text-xs mb-2">Spreads</p>
            <div className="space-y-2 font-mono text-xs">
              {/* Direct Rookies with explicit 5% incentive */}
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direct Rookies Gross Spread</span>
                  <span className="text-foreground">{(marketingDealRate * 100).toFixed(1)}% − {(rookieCommissionRate * 100).toFixed(0)}% = {(rookieGrossSpread * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>− 5% Incentive Cost (Rookies only)</span>
                  <span>−5.0%</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Net Spread on Rookies</span>
                  <span className="text-foreground">{formatCurrency(directRookieActiveTotal)} × {(rookieNetSpread * 100).toFixed(1)}% = {formatCurrency(directRookieSpreadEarnings)}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vets/Managers Personal ({(vetManagerNetSpread * 100).toFixed(1)}% net)</span>
                <span className="text-foreground">{formatCurrency(directVetManagerActiveTotal)} × {(vetManagerNetSpread * 100).toFixed(1)}% = {formatCurrency(directVetManagerSpreadEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manager Teams ({(downlineNetSpread * 100).toFixed(1)}% net)</span>
                <span className="text-foreground">{formatCurrency(managerTeamsActive)} × {(downlineNetSpread * 100).toFixed(1)}% = {formatCurrency(totalManagerTeamSpreadEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="pt-1">
            <p className="text-primary font-bold uppercase text-xs mb-3">Totals</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Team Earnings</span>
                <span className="text-foreground font-bold"><AnimatedNumber value={teamEarnings} /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Personal Earnings</span>
                <span className="text-foreground font-bold"><AnimatedNumber value={personalEarnings} /></span>
              </div>
              <div className="flex justify-between pt-3 border-t border-primary/30">
                <span className="text-success font-bold text-lg">Total Estimated Earnings</span>
                <span className="text-success font-black text-2xl"><AnimatedNumber value={totalEstimatedEarnings} /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Note */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Marketing deal is based on team active revenue (after 25% attrition). Personal earnings are calculated separately.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground mt-6 mb-6">
        Estimates are simplified planning numbers and do not include taxes, chargebacks, backend timing, or company-specific deductions.
      </p>

      {/* Apply Now CTA */}
      {onApplyClick && (
        <button
          onClick={onApplyClick}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-wide"
        >
          Apply Now
        </button>
      )}
    </div>
  );
};

export default VetCalculator;
