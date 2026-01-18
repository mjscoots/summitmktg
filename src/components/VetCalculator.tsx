import { useState, useEffect, useRef } from "react";
import { DollarSign, Users, TrendingUp, UserPlus, Calculator, User, Percent } from "lucide-react";

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
  { min: 12500000, max: Infinity, rate: 0.76 },
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
  repsPerManager: number;
  avgRookiePra: number;
  avgVetPra: number;
}

interface VetCalculatorProps {
  onApplyClick?: () => void;
  onValuesChange?: (values: VetCalculatorValues) => void;
}

// Constants
const ATTRITION_RATE = 0.20;
const DEFAULT_AVG_ROOKIE_PRA = 175000;
const DEFAULT_AVG_VET_PRA = 275000;
const DEFAULT_INCENTIVES_RATE = 0.05;

const VetCalculator = ({ onApplyClick, onValuesChange }: VetCalculatorProps) => {
  // Personal Inputs
  const [personalGrossStr, setPersonalGrossStr] = useState("");
  
  // Team Inputs
  const [numDirectRookiesStr, setNumDirectRookiesStr] = useState("");
  const [numDirectVetsStr, setNumDirectVetsStr] = useState("");
  const [numDirectManagersStr, setNumDirectManagersStr] = useState("");
  const [repsPerManagerStr, setRepsPerManagerStr] = useState("");
  const [avgRookiePraStr, setAvgRookiePraStr] = useState("175,000");
  const [avgVetPraStr, setAvgVetPraStr] = useState("275,000");
  const [incentivesRateStr, setIncentivesRateStr] = useState("5");

  // Parse string values to numbers
  const personalGrossRevenue = parseFormattedNumber(personalGrossStr);
  const numDirectRookies = parseFormattedNumber(numDirectRookiesStr);
  const numDirectVets = parseFormattedNumber(numDirectVetsStr);
  const numDirectManagers = parseFormattedNumber(numDirectManagersStr);
  const repsPerManager = parseFormattedNumber(repsPerManagerStr);
  const avgRookiePra = parseFormattedNumber(avgRookiePraStr) || DEFAULT_AVG_ROOKIE_PRA;
  const avgVetPra = parseFormattedNumber(avgVetPraStr) || DEFAULT_AVG_VET_PRA;
  const incentivesRate = (parseFormattedNumber(incentivesRateStr) || DEFAULT_INCENTIVES_RATE * 100) / 100;

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

  const handlePercentChange = (value: string, setter: (val: string) => void) => {
    const cleanValue = value.replace(/[^0-9.]/g, "");
    setter(cleanValue);
  };

  // ============= STEP 1: PERSONAL MATH =============
  const personalAttrition = personalGrossRevenue * ATTRITION_RATE;
  const personalActiveRevenue = personalGrossRevenue - personalAttrition;
  const vetCommissionRate = getVetCommissionRate(personalActiveRevenue);
  const personalEarnings = personalActiveRevenue * vetCommissionRate;

  // ============= STEP 2: TEAM GROSS BUILD (EXCLUDING PERSONAL) =============
  const directRookieGross = numDirectRookies * avgRookiePra;
  const directVetGross = numDirectVets * avgVetPra;
  const directManagerGross = numDirectManagers * avgVetPra;
  const totalDownlineReps = numDirectManagers * repsPerManager;
  const managerDownlineGross = totalDownlineReps * avgRookiePra;
  const teamGrossRevenue = directRookieGross + directVetGross + directManagerGross + managerDownlineGross;

  // ============= STEP 3: TEAM ACTIVE + MARKETING DEAL =============
  const teamAttrition = teamGrossRevenue * ATTRITION_RATE;
  const teamActiveRevenue = teamGrossRevenue - teamAttrition;
  const marketingDealRate = getMarketingDealRate(teamActiveRevenue);

  // ============= STEP 4: TEAM EARNINGS VIA SPREAD =============
  
  // (A) Spread on Direct Rookies
  const avgRookieActive = avgRookiePra * (1 - ATTRITION_RATE);
  const rookieCommissionRate = getRookieCommissionRate(avgRookieActive);
  const rookieGrossSpread = marketingDealRate - rookieCommissionRate;
  const rookieNetSpread = Math.max(0, rookieGrossSpread - incentivesRate);
  const directRookieActiveTotal = directRookieGross * (1 - ATTRITION_RATE);
  const directRookieSpreadEarnings = directRookieActiveTotal * rookieNetSpread;

  // (B) Spread on Direct Vets + Direct Managers (their personal production)
  const avgVetActive = avgVetPra * (1 - ATTRITION_RATE);
  const vetManagerCommissionRate = getVetCommissionRate(avgVetActive);
  const vetManagerGrossSpread = marketingDealRate - vetManagerCommissionRate;
  const vetManagerNetSpread = Math.max(0, vetManagerGrossSpread - incentivesRate);
  const directVetManagerActiveTotal = (directVetGross + directManagerGross) * (1 - ATTRITION_RATE);
  const directVetManagerSpreadEarnings = directVetManagerActiveTotal * vetManagerNetSpread;

  // (C) Spread on Managers' Downlines (marketing deal spread)
  const oneManagerDownlineGross = repsPerManager * avgRookiePra;
  const oneManagerDownlineActive = oneManagerDownlineGross * (1 - ATTRITION_RATE);
  const managerDealRate = getMarketingDealRate(oneManagerDownlineActive);
  const downlineGrossSpread = marketingDealRate - managerDealRate;
  const downlineNetSpread = Math.max(0, downlineGrossSpread - incentivesRate);
  const oneManagerDownlineSpreadEarnings = oneManagerDownlineActive * downlineNetSpread;
  const totalManagerDownlineSpreadEarnings = oneManagerDownlineSpreadEarnings * numDirectManagers;

  // Total Team Earnings
  const teamEarnings = directRookieSpreadEarnings + directVetManagerSpreadEarnings + totalManagerDownlineSpreadEarnings;

  // ============= STEP 5: FINAL TOTALS =============
  const totalEstimatedEarnings = personalEarnings + teamEarnings;

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        personalGrossRevenue,
        numDirectRookies,
        numDirectVets,
        numDirectManagers,
        repsPerManager,
        avgRookiePra,
        avgVetPra,
      });
    }
  }, [personalGrossRevenue, numDirectRookies, numDirectVets, numDirectManagers, repsPerManager, avgRookiePra, avgVetPra, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      {/* PERSONAL INPUTS */}
      <div className="mb-8">
        <h3 className="text-xl font-black text-foreground uppercase tracking-wide mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
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
              placeholder="Type here"
            />
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-border mb-8" />

      {/* TEAM INPUTS */}
      <div className="mb-8">
        <h3 className="text-xl font-black text-foreground uppercase tracking-wide mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-3">
          <Calculator className="w-6 h-6 text-primary" />
          Team Inputs
        </h3>
        <p className="text-xs text-muted-foreground mb-6">(Not including personal)</p>

        <div className="space-y-6">
          {/* Direct Rookies */}
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
              placeholder="Type here"
            />
          </div>

          {/* Direct Vets */}
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
              placeholder="Type here"
            />
          </div>

          {/* Direct Managers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Managers</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Veterans with their own reps.</p>
            <input
              type="text"
              inputMode="numeric"
              value={numDirectManagersStr}
              onChange={e => handleCountChange(e.target.value, setNumDirectManagersStr)}
              className="input-field"
              placeholder="Type here"
            />
          </div>

          {/* Reps per Manager */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Reps per Manager</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">The number of reps each direct manager has in their downline.</p>
            <input
              type="text"
              inputMode="numeric"
              value={repsPerManagerStr}
              onChange={e => handleCountChange(e.target.value, setRepsPerManagerStr)}
              className="input-field"
              placeholder="Type here"
            />
          </div>

          {/* Average Rookie PRA Amount */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Average Rookie PRA Amount</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Summit rookie average is $175,000.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={avgRookiePraStr}
                onChange={e => handleCurrencyChange(e.target.value, setAvgRookiePraStr)}
                className="input-field pl-8"
                placeholder="175,000"
              />
            </div>
          </div>

          {/* Average Vet/Manager PRA Amount */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Average Vet/Manager PRA Amount</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Summit vet average is $275,000.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={avgVetPraStr}
                onChange={e => handleCurrencyChange(e.target.value, setAvgVetPraStr)}
                className="input-field pl-8"
                placeholder="275,000"
              />
            </div>
          </div>

          {/* Incentives Cost % */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Incentives Cost %</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Deducted from your spread (default 5%).</p>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={incentivesRateStr}
                onChange={e => handlePercentChange(e.target.value, setIncentivesRateStr)}
                className="input-field pr-8"
                placeholder="5"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATION BREAKDOWN */}
      <div className="border-t border-border pt-8">
        <h3 className="text-xl font-black text-foreground uppercase tracking-wide mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-primary" />
          Calculation Breakdown
        </h3>

        <div className="space-y-5">
          
          {/* Step 1: Personal Math */}
          <div className="p-5 rounded-xl bg-secondary/30 border border-border">
            <p className="text-sm text-primary uppercase tracking-wide font-bold mb-4">Step 1 — Personal Earnings</p>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Personal Gross</span>
                <span className="text-foreground">{formatCurrency(personalGrossRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">× 0.80 (after 20% attrition)</span>
                <span className="text-foreground">= {formatCurrency(personalActiveRevenue)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-2">
                <span className="text-foreground">Personal Active Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(personalActiveRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vet Commission Rate (lookup)</span>
                <span className="text-primary font-bold">{(vetCommissionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground/70 italic">
                <span>Formula: {formatCurrency(personalActiveRevenue)} × {(vetCommissionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg mt-2">
                <span className="text-foreground font-semibold">Personal Earnings</span>
                <span className="text-primary font-bold text-lg"><AnimatedNumber value={personalEarnings} /></span>
              </div>
            </div>
          </div>

          {/* Step 2: Team Gross Build */}
          <div className="p-5 rounded-xl bg-secondary/30 border border-border">
            <p className="text-sm text-primary uppercase tracking-wide font-bold mb-4">Step 2 — Team Gross Revenue (Excluding Personal)</p>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Direct Rookies: {numDirectRookies} × {formatCurrency(avgRookiePra)}</span>
                <span className="text-foreground">{formatCurrency(directRookieGross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Direct Vets: {numDirectVets} × {formatCurrency(avgVetPra)}</span>
                <span className="text-foreground">{formatCurrency(directVetGross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Direct Managers: {numDirectManagers} × {formatCurrency(avgVetPra)}</span>
                <span className="text-foreground">{formatCurrency(directManagerGross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Manager Downlines: {totalDownlineReps} × {formatCurrency(avgRookiePra)}</span>
                <span className="text-foreground">{formatCurrency(managerDownlineGross)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-2">
                <span className="text-foreground font-semibold">Team Gross Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(teamGrossRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Team Active + Marketing Deal */}
          <div className="p-5 rounded-xl bg-secondary/30 border border-border">
            <p className="text-sm text-primary uppercase tracking-wide font-bold mb-4">Step 3 — Team Active Revenue & Your Marketing Deal</p>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Team Gross Revenue</span>
                <span className="text-foreground">{formatCurrency(teamGrossRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">× 0.80 (after 20% attrition)</span>
                <span className="text-foreground">= {formatCurrency(teamActiveRevenue)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-2">
                <span className="text-foreground font-semibold">Team Active Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(teamActiveRevenue)}</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg mt-3">
                <span className="text-foreground font-semibold">Your Marketing Deal % (lookup)</span>
                <span className="text-primary font-bold text-xl">{(marketingDealRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Step 4: Team Earnings via Spread */}
          <div className="p-5 rounded-xl bg-secondary/30 border border-border">
            <p className="text-sm text-primary uppercase tracking-wide font-bold mb-4">Step 4 — Team Earnings (Spread)</p>
            <p className="text-xs text-muted-foreground mb-4">Net Spread = (Your Deal % − Their %) − Incentives Cost %. Earnings = Active Revenue × Net Spread %.</p>
            
            <div className="space-y-4">
              {/* A) Direct Rookies */}
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <p className="text-xs text-primary uppercase font-bold mb-3">A) Spread on Direct Rookies</p>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div>Avg Rookie Active = {formatCurrency(avgRookiePra)} × 0.80 = {formatCurrency(avgRookieActive)}</div>
                  <div>Rookie Commission % (lookup) = {(rookieCommissionRate * 100).toFixed(0)}%</div>
                  <div>Gross Spread = {(marketingDealRate * 100).toFixed(1)}% − {(rookieCommissionRate * 100).toFixed(0)}% = {(rookieGrossSpread * 100).toFixed(1)}%</div>
                  <div>Net Spread = {(rookieGrossSpread * 100).toFixed(1)}% − {(incentivesRate * 100).toFixed(0)}% = {(rookieNetSpread * 100).toFixed(1)}%</div>
                  <div>Total Rookie Active = {formatCurrency(directRookieActiveTotal)}</div>
                  <div className="text-foreground pt-1">Earnings = {formatCurrency(directRookieActiveTotal)} × {(rookieNetSpread * 100).toFixed(1)}%</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30">
                  <span className="text-foreground text-sm font-medium">Direct Rookie Spread Earnings</span>
                  <span className="text-foreground font-bold"><AnimatedNumber value={directRookieSpreadEarnings} /></span>
                </div>
              </div>

              {/* B) Direct Vets + Managers Personal */}
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <p className="text-xs text-primary uppercase font-bold mb-3">B) Spread on Direct Vets & Managers (Personal)</p>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div>Avg Vet/Manager Active = {formatCurrency(avgVetPra)} × 0.80 = {formatCurrency(avgVetActive)}</div>
                  <div>Vet Commission % (lookup) = {(vetManagerCommissionRate * 100).toFixed(0)}%</div>
                  <div>Gross Spread = {(marketingDealRate * 100).toFixed(1)}% − {(vetManagerCommissionRate * 100).toFixed(0)}% = {(vetManagerGrossSpread * 100).toFixed(1)}%</div>
                  <div>Net Spread = {(vetManagerGrossSpread * 100).toFixed(1)}% − {(incentivesRate * 100).toFixed(0)}% = {(vetManagerNetSpread * 100).toFixed(1)}%</div>
                  <div>Total Vet/Manager Active = {formatCurrency(directVetManagerActiveTotal)}</div>
                  <div className="text-foreground pt-1">Earnings = {formatCurrency(directVetManagerActiveTotal)} × {(vetManagerNetSpread * 100).toFixed(1)}%</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30">
                  <span className="text-foreground text-sm font-medium">Vet/Manager Personal Spread Earnings</span>
                  <span className="text-foreground font-bold"><AnimatedNumber value={directVetManagerSpreadEarnings} /></span>
                </div>
              </div>

              {/* C) Manager Downlines */}
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <p className="text-xs text-primary uppercase font-bold mb-3">C) Spread on Managers' Downlines</p>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div>One Manager Downline Gross = {repsPerManager} × {formatCurrency(avgRookiePra)} = {formatCurrency(oneManagerDownlineGross)}</div>
                  <div>One Manager Downline Active = × 0.80 = {formatCurrency(oneManagerDownlineActive)}</div>
                  <div>Manager Deal % (lookup) = {(managerDealRate * 100).toFixed(1)}%</div>
                  <div>Gross Spread = {(marketingDealRate * 100).toFixed(1)}% − {(managerDealRate * 100).toFixed(1)}% = {(downlineGrossSpread * 100).toFixed(1)}%</div>
                  <div>Net Spread = {(downlineGrossSpread * 100).toFixed(1)}% − {(incentivesRate * 100).toFixed(0)}% = {(downlineNetSpread * 100).toFixed(1)}%</div>
                  <div>One Manager Earnings = {formatCurrency(oneManagerDownlineActive)} × {(downlineNetSpread * 100).toFixed(1)}% = {formatCurrency(oneManagerDownlineSpreadEarnings)}</div>
                  <div className="text-foreground pt-1">Total = {formatCurrency(oneManagerDownlineSpreadEarnings)} × {numDirectManagers} managers</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30">
                  <span className="text-foreground text-sm font-medium">Manager Downline Spread Earnings</span>
                  <span className="text-foreground font-bold"><AnimatedNumber value={totalManagerDownlineSpreadEarnings} /></span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-foreground font-semibold">Total Team Earnings (A + B + C)</span>
                <span className="text-primary font-bold text-lg"><AnimatedNumber value={teamEarnings} /></span>
              </div>
            </div>
          </div>

          {/* Step 5: Final Totals */}
          <div className="p-6 rounded-xl bg-success/20 border-2 border-success">
            <p className="text-sm text-success uppercase tracking-wide font-bold mb-4">Step 5 — Final Totals</p>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Personal Earnings</span>
                <span className="text-foreground font-bold"><AnimatedNumber value={personalEarnings} /></span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Team Earnings</span>
                <span className="text-foreground font-bold"><AnimatedNumber value={teamEarnings} /></span>
              </div>
              <div className="flex justify-between pt-4 border-t border-success/30">
                <span className="text-success font-bold text-xl">Total Estimated Earnings</span>
                <span className="text-success font-black text-3xl"><AnimatedNumber value={totalEstimatedEarnings} /></span>
              </div>
            </div>
          </div>

          {/* Disclaimer Note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Marketing deal is based on team active revenue (after 20% attrition). Personal earnings are calculated separately using the Vet commission table.
          </p>
        </div>
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
