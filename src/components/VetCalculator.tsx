import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, UserPlus, Calculator } from "lucide-react";

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

const getMarketingDealRate = (teamRevenue: number): number => {
  const tier = MARKETING_DEAL_TIERS.find(t => teamRevenue >= t.min && teamRevenue <= t.max);
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
  const num = parseInt(value.replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num;
};

export interface VetCalculatorValues {
  numDirectRookies: number;
  numDirectVeterans: number;
  numDirectManagers: number;
  repsPerManager: number;
  totalTeamActiveRevenue: number;
}

interface VetCalculatorProps {
  onApplyClick?: () => void;
  onValuesChange?: (values: VetCalculatorValues) => void;
}

const VetCalculator = ({ onApplyClick, onValuesChange }: VetCalculatorProps) => {
  // Direct Rookies
  const [numDirectRookiesStr, setNumDirectRookiesStr] = useState("");
  // Direct Veterans
  const [numDirectVeteransStr, setNumDirectVeteransStr] = useState("");
  // Direct Managers
  const [numDirectManagersStr, setNumDirectManagersStr] = useState("");
  // Reps per Manager
  const [repsPerManagerStr, setRepsPerManagerStr] = useState("");

  // Parse string values to numbers
  const numDirectRookies = parseFormattedNumber(numDirectRookiesStr);
  const numDirectVeterans = parseFormattedNumber(numDirectVeteransStr);
  const numDirectManagers = parseFormattedNumber(numDirectManagersStr);
  const repsPerManager = parseFormattedNumber(repsPerManagerStr);

  // Constants - Updated averages
  const DIRECT_ROOKIE_AVG_REVENUE = 170000;
  const DIRECT_VETERAN_AVG_REVENUE = 275000;
  const ROOKIE_ATTRITION = 0.25; // 25% falloff
  const ROOKIE_CANCEL_RATE = 0.20; // 20% cancels
  const VETERAN_CANCEL_RATE = 0.15; // 15% cancels
  const INCENTIVE_RATE = 0.05; // 5% incentives

  // Handle numeric input change
  const handleNumericChange = (value: string, setter: (val: string) => void) => {
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

  // ============= CALCULATIONS =============

  // Direct Rookies: raw revenue before attrition
  const directRookiesGrossRevenue = numDirectRookies * DIRECT_ROOKIE_AVG_REVENUE;
  
  // Direct Veterans: raw revenue before attrition
  const directVeteransGrossRevenue = numDirectVeterans * DIRECT_VETERAN_AVG_REVENUE;
  
  // Downline Reps (via managers): each manager has repsPerManager rookies
  const totalDownlineReps = numDirectManagers * repsPerManager;
  const downlineRepsGrossRevenue = totalDownlineReps * DIRECT_ROOKIE_AVG_REVENUE;

  // Total Team Revenue (before attrition)
  const totalGrossRevenue = directRookiesGrossRevenue + directVeteransGrossRevenue + downlineRepsGrossRevenue;

  // Attrition Adjustments
  const directRookiesRetained = numDirectRookies * (1 - ROOKIE_ATTRITION);
  const directRookiesActiveRevenue = directRookiesRetained * DIRECT_ROOKIE_AVG_REVENUE * (1 - ROOKIE_CANCEL_RATE);
  
  const directVeteransActiveRevenue = numDirectVeterans * DIRECT_VETERAN_AVG_REVENUE * (1 - VETERAN_CANCEL_RATE);
  
  const downlineRepsRetained = totalDownlineReps * (1 - ROOKIE_ATTRITION);
  const downlineRepsActiveRevenue = downlineRepsRetained * DIRECT_ROOKIE_AVG_REVENUE * (1 - ROOKIE_CANCEL_RATE);

  // Gross Team Revenue After Attrition
  const totalTeamActiveRevenue = directRookiesActiveRevenue + directVeteransActiveRevenue + downlineRepsActiveRevenue;

  // Marketing Deal Rate based on team revenue
  const marketingDealRate = getMarketingDealRate(totalTeamActiveRevenue);

  // Cost Deductions
  const incentivesCost = directRookiesActiveRevenue * INCENTIVE_RATE; // 5% on direct rookies only
  const housingCost = 0; // Placeholder - can be adjusted
  const otherCosts = 0; // Placeholder
  const totalDeductions = incentivesCost + housingCost + otherCosts;

  // Net Revenue Calculation
  const netRevenue = totalTeamActiveRevenue - totalDeductions;

  // Final Estimated Earnings
  // Override = Marketing Deal % - Rep Commission %
  const ROOKIE_COMMISSION = 0.40;
  const VETERAN_COMMISSION = 0.40;
  
  const directRookieOverride = marketingDealRate - ROOKIE_COMMISSION;
  const directVeteranOverride = marketingDealRate - VETERAN_COMMISSION;
  
  const directRookieEarnings = (directRookiesActiveRevenue * 0.95) * directRookieOverride; // After 5% expense
  const directVeteranEarnings = directVeteransActiveRevenue * directVeteranOverride;
  const downlineEarnings = downlineRepsActiveRevenue * directVeteranOverride;
  
  const finalEarnings = directRookieEarnings + directVeteranEarnings + downlineEarnings;

  // Pass values up to parent
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        numDirectRookies,
        numDirectVeterans,
        numDirectManagers,
        repsPerManager,
        totalTeamActiveRevenue,
      });
    }
  }, [numDirectRookies, numDirectVeterans, numDirectManagers, repsPerManager, totalTeamActiveRevenue, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      {/* INPUT SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Team Inputs</h3>
        </div>

        {/* Direct Rookies */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Rookies</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Summit average per direct rookie: $170,000
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={numDirectRookiesStr}
            onChange={e => handleNumericChange(e.target.value, setNumDirectRookiesStr)}
            className="input-field"
            placeholder="0"
          />
        </div>

        {/* Direct Veterans */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Veterans</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Summit Vet average: $275,000
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={numDirectVeteransStr}
            onChange={e => handleNumericChange(e.target.value, setNumDirectVeteransStr)}
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
            onChange={e => handleNumericChange(e.target.value, setNumDirectManagersStr)}
            className="input-field"
            placeholder="0"
          />
        </div>

        {/* Reps per Manager */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Reps per Manager</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            The number of reps each direct manager has in their downline.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={repsPerManagerStr}
            onChange={e => handleNumericChange(e.target.value, setRepsPerManagerStr)}
            className="input-field"
            placeholder="0"
          />
        </div>
      </div>

      {/* SHOW THE MATH SECTION */}
      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Show the Math</h3>
        </div>

        {/* Math Stack */}
        <div className="space-y-4">
          {/* Marketing Deal Percentage */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-1">Marketing Deal Percentage</p>
            <p className="text-2xl font-black text-foreground">{(marketingDealRate * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Based on total team revenue tier</p>
          </div>

          {/* Total Team Revenue */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-2">Total Team Revenue (Gross)</p>
            <div className="space-y-1 text-sm text-muted-foreground mb-2">
              <div className="flex justify-between">
                <span>Direct Rookies ({numDirectRookies} × $170,000)</span>
                <span className="text-foreground">{formatCurrency(directRookiesGrossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Veterans ({numDirectVeterans} × $275,000)</span>
                <span className="text-foreground">{formatCurrency(directVeteransGrossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Downline Reps ({totalDownlineReps} × $170,000)</span>
                <span className="text-foreground">{formatCurrency(downlineRepsGrossRevenue)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(totalGrossRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Attrition Adjustment */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-2">Attrition Adjustment</p>
            <div className="space-y-1 text-sm text-muted-foreground mb-2">
              <div className="flex justify-between">
                <span>Rookies: 25% falloff + 20% cancels</span>
                <span className="text-foreground">{formatCurrency(directRookiesActiveRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Veterans: 15% cancels</span>
                <span className="text-foreground">{formatCurrency(directVeteransActiveRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Downline: 25% falloff + 20% cancels</span>
                <span className="text-foreground">{formatCurrency(downlineRepsActiveRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Gross Team Revenue After Attrition */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-1">Gross Team Revenue After Attrition</p>
            <p className="text-2xl font-black text-foreground">{formatCurrency(totalTeamActiveRevenue)}</p>
          </div>

          {/* Cost Deductions */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-2">Cost Deductions</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Incentives (5% on direct rookies)</span>
                <span className="text-foreground">-{formatCurrency(incentivesCost)}</span>
              </div>
              {housingCost > 0 && (
                <div className="flex justify-between">
                  <span>Housing</span>
                  <span className="text-foreground">-{formatCurrency(housingCost)}</span>
                </div>
              )}
              {otherCosts > 0 && (
                <div className="flex justify-between">
                  <span>Other fixed costs</span>
                  <span className="text-foreground">-{formatCurrency(otherCosts)}</span>
                </div>
              )}
            </div>
            <div className="pt-2 mt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Total Deductions</span>
                <span className="text-lg font-bold text-foreground">-{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Revenue */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-primary uppercase tracking-wide font-bold mb-1">Net Revenue Calculation</p>
            <p className="text-2xl font-black text-foreground">{formatCurrency(netRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active revenue minus deductions</p>
          </div>

          {/* Final Estimated Earnings */}
          <div className="p-6 rounded-lg bg-success/20 border-2 border-success">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <p className="text-sm text-success uppercase tracking-wide font-bold">Final Estimated Earnings</p>
            </div>
            <p className="text-4xl font-black text-success">{formatCurrency(finalEarnings)}</p>
          </div>
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
