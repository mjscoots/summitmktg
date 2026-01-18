import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, UserPlus, Calculator, User } from "lucide-react";

// Marketing Deal Tiers (based on TEAM Active Revenue only)
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

// Vet Commission Scale (based on personal active revenue)
const VET_COMMISSION_TIERS = [
  { min: 0, max: 99999, rate: 0.40 },
  { min: 100000, max: 199999, rate: 0.42 },
  { min: 200000, max: 349999, rate: 0.44 },
  { min: 350000, max: 499999, rate: 0.46 },
  { min: 500000, max: Infinity, rate: 0.48 },
];

const getMarketingDealRate = (teamActiveRevenue: number): number => {
  const tier = MARKETING_DEAL_TIERS.find(t => teamActiveRevenue >= t.min && teamActiveRevenue <= t.max);
  return tier ? tier.rate : 0.45;
};

const getVetCommissionRate = (personalActiveRevenue: number): number => {
  const tier = VET_COMMISSION_TIERS.find(t => personalActiveRevenue >= t.min && personalActiveRevenue <= t.max);
  return tier ? tier.rate : 0.40;
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
  const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
};

const formatNumberInput = (value: string): string => {
  const cleanValue = value.replace(/[^0-9]/g, "");
  if (cleanValue === "") return "";
  const parsed = parseInt(cleanValue, 10);
  return isNaN(parsed) ? "" : parsed.toLocaleString('en-US');
};

export interface VetCalculatorValues {
  personalGrossRevenue: number;
  numDirectRookies: number;
  numDirectManagers: number;
  repsPerManager: number;
  avgPraAmount: number;
}

interface VetCalculatorProps {
  onApplyClick?: () => void;
  onValuesChange?: (values: VetCalculatorValues) => void;
}

// Constants
const ATTRITION_RATE = 0.20; // 20% attrition across the board
const INCENTIVE_RATE = 0.05; // 5% incentives on direct rookies
const DEFAULT_AVG_PRA = 150000;
const SUMMIT_VET_AVG = 275000;

const VetCalculator = ({ onApplyClick, onValuesChange }: VetCalculatorProps) => {
  // Personal Inputs
  const [personalGrossStr, setPersonalGrossStr] = useState("");
  
  // Team Inputs
  const [numDirectRookiesStr, setNumDirectRookiesStr] = useState("");
  const [numDirectManagersStr, setNumDirectManagersStr] = useState("");
  const [repsPerManagerStr, setRepsPerManagerStr] = useState("");
  const [avgPraAmountStr, setAvgPraAmountStr] = useState("150,000");

  // Parse string values to numbers
  const personalGrossRevenue = parseFormattedNumber(personalGrossStr);
  const numDirectRookies = parseFormattedNumber(numDirectRookiesStr);
  const numDirectManagers = parseFormattedNumber(numDirectManagersStr);
  const repsPerManager = parseFormattedNumber(repsPerManagerStr);
  const avgPraAmount = parseFormattedNumber(avgPraAmountStr) || DEFAULT_AVG_PRA;

  // Handle currency input change
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    setter(formatNumberInput(value));
  };

  // Handle count input change
  const handleCountChange = (value: string, setter: (val: string) => void) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (cleanValue === "") {
      setter("");
      return;
    }
    const parsed = parseInt(cleanValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed.toLocaleString('en-US'));
    }
  };

  // ============= STEP 1: PERSONAL MATH =============
  const personalActiveRevenue = personalGrossRevenue * (1 - ATTRITION_RATE);
  const vetCommissionRate = getVetCommissionRate(personalActiveRevenue);
  const personalEarnings = personalActiveRevenue * vetCommissionRate;

  // ============= STEP 2: TEAM GROSS BUILD (EXCLUDING PERSONAL) =============
  const directRookieGross = numDirectRookies * avgPraAmount;
  const directManagerPersonalGross = numDirectManagers * SUMMIT_VET_AVG;
  const totalDownlineReps = numDirectManagers * repsPerManager;
  const downlineRepGross = totalDownlineReps * avgPraAmount;
  const teamGrossRevenue = directRookieGross + directManagerPersonalGross + downlineRepGross;

  // ============= STEP 3: TEAM ACTIVE + MARKETING DEAL =============
  const directRookieActive = directRookieGross * (1 - ATTRITION_RATE);
  const directManagerActive = directManagerPersonalGross * (1 - ATTRITION_RATE);
  const downlineRepActive = downlineRepGross * (1 - ATTRITION_RATE);
  const teamActiveRevenue = directRookieActive + directManagerActive + downlineRepActive;
  
  const marketingDealRate = getMarketingDealRate(teamActiveRevenue);

  // ============= STEP 4: TEAM EARNINGS VIA SPREAD =============
  
  // (A) Spread on Direct Rookies
  const rookiePayRate = 0.40; // Rookies get 40%
  const spreadOnRookies = Math.max(0, marketingDealRate - rookiePayRate);
  const rookieSpreadEarnings = (directRookieActive * (1 - INCENTIVE_RATE)) * spreadOnRookies;

  // (B) Spread on Direct Managers' Personal Production
  const managerPersonalPayRates = numDirectManagers > 0 
    ? Array.from({ length: numDirectManagers }, () => {
        const managerActiveRevenue = SUMMIT_VET_AVG * (1 - ATTRITION_RATE);
        return getVetCommissionRate(managerActiveRevenue);
      })
    : [];
  
  const avgManagerPayRate = managerPersonalPayRates.length > 0 
    ? managerPersonalPayRates.reduce((a, b) => a + b, 0) / managerPersonalPayRates.length 
    : 0;
  
  const spreadOnManagerPersonal = Math.max(0, marketingDealRate - avgManagerPayRate);
  const managerPersonalSpreadEarnings = directManagerActive * spreadOnManagerPersonal;

  // (C) Spread on Managers' Downlines
  // Each manager's marketing deal is based on their own downline active revenue
  const managerDownlineActiveRevenue = repsPerManager * avgPraAmount * (1 - ATTRITION_RATE);
  const managerMarketingDealRate = getMarketingDealRate(managerDownlineActiveRevenue);
  const spreadOnManagerDownline = Math.max(0, marketingDealRate - managerMarketingDealRate);
  const managerDownlineSpreadEarnings = downlineRepActive * spreadOnManagerDownline;

  // Total Team Earnings
  const teamEarnings = rookieSpreadEarnings + managerPersonalSpreadEarnings + managerDownlineSpreadEarnings;

  // ============= STEP 5: FINAL TOTALS =============
  const totalEstimatedEarnings = personalEarnings + teamEarnings;

  // Pass values up to parent
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        personalGrossRevenue,
        numDirectRookies,
        numDirectManagers,
        repsPerManager,
        avgPraAmount,
      });
    }
  }, [personalGrossRevenue, numDirectRookies, numDirectManagers, repsPerManager, avgPraAmount, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      {/* PERSONAL INPUTS */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Personal Inputs</h3>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Personal Revenue (Gross)</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Your projected personal gross revenue for the season.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={personalGrossStr}
              onChange={e => handleCurrencyChange(e.target.value, setPersonalGrossStr)}
              className="input-field pl-8"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-border mb-8" />

      {/* TEAM INPUTS */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Team Inputs</h3>
          <span className="text-xs text-muted-foreground">(Not Including Personal)</span>
        </div>

        {/* Direct Rookies */}
        <div className="mb-6">
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
            placeholder="0"
          />
        </div>

        {/* Direct Managers */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Managers</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Veterans with their own reps.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={numDirectManagersStr}
            onChange={e => handleCountChange(e.target.value, setNumDirectManagersStr)}
            className="input-field"
            placeholder="0"
          />
        </div>

        {/* Reps per Manager */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Reps per Manager</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            The number of reps each direct manager has in their downline.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={repsPerManagerStr}
            onChange={e => handleCountChange(e.target.value, setRepsPerManagerStr)}
            className="input-field"
            placeholder="0"
          />
        </div>

        {/* Average PRA Amount */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Average PRA Amount (Gross)</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Summit rookie average is $175,000.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={avgPraAmountStr}
              onChange={e => handleCurrencyChange(e.target.value, setAvgPraAmountStr)}
              className="input-field pl-8"
              placeholder="150,000"
            />
          </div>
        </div>
      </div>

      {/* CALCULATION BREAKDOWN */}
      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Calculation Breakdown</h3>
        </div>

        {/* Math Stack */}
        <div className="space-y-4">
          
          {/* Step 1: Personal Math */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-3">Step 1 — Personal Earnings</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personal Gross Revenue</span>
                <span className="text-foreground font-medium">{formatCurrency(personalGrossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attrition (20%)</span>
                <span className="text-foreground font-medium">−{formatCurrency(personalGrossRevenue * ATTRITION_RATE)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-foreground font-medium">Personal Active Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(personalActiveRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vet Commission Rate</span>
                <span className="text-foreground font-medium">{(vetCommissionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between bg-primary/10 p-2 rounded mt-2">
                <span className="text-foreground font-semibold">Personal Earnings</span>
                <span className="text-primary font-bold">{formatCurrency(personalEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Step 2: Team Gross Build */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-3">Step 2 — Team Gross Revenue (Excluding Personal)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Direct Rookies ({numDirectRookies} × {formatCurrency(avgPraAmount)})</span>
                <span className="text-foreground font-medium">{formatCurrency(directRookieGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Direct Managers Personal ({numDirectManagers} × {formatCurrency(SUMMIT_VET_AVG)})</span>
                <span className="text-foreground font-medium">{formatCurrency(directManagerPersonalGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downline Reps ({totalDownlineReps} × {formatCurrency(avgPraAmount)})</span>
                <span className="text-foreground font-medium">{formatCurrency(downlineRepGross)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-foreground font-semibold">Team Gross Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(teamGrossRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Team Active + Marketing Deal */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-3">Step 3 — Team Active Revenue & Marketing Deal</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Gross Revenue</span>
                <span className="text-foreground font-medium">{formatCurrency(teamGrossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attrition (20%)</span>
                <span className="text-foreground font-medium">−{formatCurrency(teamGrossRevenue * ATTRITION_RATE)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-foreground font-medium">Team Active Revenue</span>
                <span className="text-foreground font-bold">{formatCurrency(teamActiveRevenue)}</span>
              </div>
              <div className="flex justify-between bg-primary/10 p-2 rounded mt-2">
                <span className="text-foreground font-semibold">Your Marketing Deal %</span>
                <span className="text-primary font-bold text-lg">{(marketingDealRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Step 4: Team Earnings via Spread */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-3">Step 4 — Team Earnings (Spread)</p>
            <p className="text-xs text-muted-foreground mb-3">You earn the spread: (Your Deal % − Their Pay %) on each revenue source.</p>
            
            <div className="space-y-3 text-sm">
              {/* Direct Rookies Spread */}
              <div className="p-3 bg-background/50 rounded">
                <p className="text-xs text-muted-foreground mb-2">A) Spread on Direct Rookies</p>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Spread: {(marketingDealRate * 100).toFixed(1)}% − 40% = {(spreadOnRookies * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>After 5% incentives: {formatCurrency(directRookieActive * (1 - INCENTIVE_RATE))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Direct Rookie Spread Earnings</span>
                  <span className="text-foreground font-medium">{formatCurrency(rookieSpreadEarnings)}</span>
                </div>
              </div>

              {/* Manager Personal Spread */}
              <div className="p-3 bg-background/50 rounded">
                <p className="text-xs text-muted-foreground mb-2">B) Spread on Managers' Personal Production</p>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Spread: {(marketingDealRate * 100).toFixed(1)}% − {(avgManagerPayRate * 100).toFixed(0)}% = {(spreadOnManagerPersonal * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Manager Personal Spread Earnings</span>
                  <span className="text-foreground font-medium">{formatCurrency(managerPersonalSpreadEarnings)}</span>
                </div>
              </div>

              {/* Manager Downline Spread */}
              <div className="p-3 bg-background/50 rounded">
                <p className="text-xs text-muted-foreground mb-2">C) Spread on Managers' Downlines</p>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Manager Deal: {(managerMarketingDealRate * 100).toFixed(1)}% | Your Spread: {(spreadOnManagerDownline * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Manager Downline Spread Earnings</span>
                  <span className="text-foreground font-medium">{formatCurrency(managerDownlineSpreadEarnings)}</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-foreground font-semibold">Total Team Earnings</span>
                <span className="text-primary font-bold">{formatCurrency(teamEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Step 5: Final Totals */}
          <div className="p-6 rounded-lg bg-success/20 border-2 border-success">
            <p className="text-xs text-success uppercase tracking-wide font-bold mb-4">Step 5 — Final Totals</p>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Personal Earnings</span>
                <span className="text-foreground font-bold">{formatCurrency(personalEarnings)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Team Earnings</span>
                <span className="text-foreground font-bold">{formatCurrency(teamEarnings)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-success/30">
                <span className="text-success font-bold text-xl">Total Estimated Earnings</span>
                <span className="text-success font-black text-3xl">{formatCurrency(totalEstimatedEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Disclaimer Note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Marketing deal is based on team active revenue (after 20% attrition). Personal earnings are calculated separately.
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
