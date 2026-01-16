import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, User, UserPlus, AlertTriangle } from "lucide-react";

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

const VETERAN_PERSONAL_TIERS = [
  { min: 0, max: 199999, rate: 0.40 },
  { min: 200000, max: 249999, rate: 0.50 },
  { min: 250000, max: 299999, rate: 0.55 },
  { min: 300000, max: 399999, rate: 0.60 },
  { min: 400000, max: 499999, rate: 0.65 },
  { min: 500000, max: Infinity, rate: 0.70 },
];

const getMarketingDealRate = (teamRevenue: number): number => {
  const tier = MARKETING_DEAL_TIERS.find(t => teamRevenue >= t.min && teamRevenue <= t.max);
  return tier ? tier.rate : 0.45;
};

const getPersonalRate = (revenue: number): number => {
  const tier = VETERAN_PERSONAL_TIERS.find(t => revenue >= t.min && revenue <= t.max);
  return tier ? tier.rate : VETERAN_PERSONAL_TIERS[0].rate;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatWithCommas = (value: string): string => {
  if (value === "") return "";
  const num = parseInt(value.replace(/,/g, ""), 10);
  if (isNaN(num)) return "";
  return num.toLocaleString('en-US');
};

const parseFormattedNumber = (value: string): number => {
  if (value === "") return 0;
  const num = parseInt(value.replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num;
};

export interface VetCalculatorValues {
  numDirectRookies: number;
  numDirectVeterans: number;
  rookiesPerVeteran: number;
  includePersonal: boolean;
  personalRevenue: number;
  totalTeamActiveRevenue: number;
  personalRate: number;
  personalEarnings: number;
}

interface VetCalculatorProps {
  onApplyClick?: () => void;
  onValuesChange?: (values: VetCalculatorValues) => void;
}

const VetCalculator = ({ onApplyClick, onValuesChange }: VetCalculatorProps) => {
  // Personal Production (always included)
  const includePersonal = true;
  const [personalRevenueStr, setPersonalRevenueStr] = useState("");

  // Direct Rookies
  const [numDirectRookiesStr, setNumDirectRookiesStr] = useState("");

  // Direct Veterans
  const [numDirectVeteransStr, setNumDirectVeteransStr] = useState("");

  // Rookies Per Veteran
  const [rookiesPerVeteranStr, setRookiesPerVeteranStr] = useState("");

  // Parse string values to numbers (empty string = 0 for calculations)
  const personalRevenue = parseFormattedNumber(personalRevenueStr);
  const numDirectRookies = parseFormattedNumber(numDirectRookiesStr);
  const numDirectVeterans = parseFormattedNumber(numDirectVeteransStr);
  const rookiesPerVeteran = parseFormattedNumber(rookiesPerVeteranStr);

  // Constants
  const DIRECT_ROOKIE_AVG_REVENUE = 220000;
  const DIRECT_VETERAN_AVG_REVENUE = 337000;
  const ROOKIE_COMMISSION_RATE = 0.40;
  const VETERAN_COMMISSION_RATE = 0.40;

  // Handle numeric input change - removes leading zeros and formats with commas
  const handleNumericChange = (value: string, setter: (val: string) => void) => {
    // Remove any non-numeric characters except commas
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (cleanValue === "") {
      setter("");
      return;
    }
    // Parse and format with commas
    const parsed = parseInt(cleanValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed.toLocaleString('en-US'));
    }
  };

  // ============= CALCULATIONS =============

  // 1) PERSONAL PRODUCTION
  // - 15% cancels (85% retained)
  // - Does NOT count toward marketing deal
  // - Earnings = (Marketing Deal % - Veteran commission %)
  const personalActiveRevenue = personalRevenue * 0.85;
  const personalRate = getPersonalRate(personalActiveRevenue);

  // 2) DIRECT ROOKIES
  // - 25% falloff (75% retention)
  // - 20% cancels on serviced revenue
  // - 5% expense on direct rookies ONLY
  // - Counts toward marketing deal
  const retainedDirectRookies = numDirectRookies * 0.75;
  const directRookieActiveRevenue = DIRECT_ROOKIE_AVG_REVENUE * 0.80; // 20% cancels
  const directRookieRevenueAfterExpense = directRookieActiveRevenue * 0.95; // 5% expense
  const directRookiesRevenue = retainedDirectRookies * directRookieRevenueAfterExpense;

  // 3) DIRECT VETERANS
  // - 0% falloff (100% retention)
  // - 15% cancels on serviced revenue
  // - NO expenses
  // - Counts toward marketing deal
  const directVeteranActiveRevenue = DIRECT_VETERAN_AVG_REVENUE * 0.85; // 15% cancels
  const directVeteransRevenue = numDirectVeterans * directVeteranActiveRevenue;

  // 4) ROOKIES PER VETERAN (veteran-led rookies)
  // - 25% falloff (75% retention)
  // - 20% cancels on serviced revenue
  // - NO expenses on veteran rookies
  // - Counts toward marketing deal
  // - Override calculated at veteran level only
  const totalVeteranRookies = numDirectVeterans * rookiesPerVeteran;
  const retainedVeteranRookies = totalVeteranRookies * 0.75;
  const veteranRookieActiveRevenue = DIRECT_ROOKIE_AVG_REVENUE * 0.80; // 20% cancels, no expense
  const veteranRookiesRevenue = retainedVeteranRookies * veteranRookieActiveRevenue;

  // Total team revenue for marketing deal (personal NOT included)
  const totalTeamActiveRevenue = directRookiesRevenue + directVeteransRevenue + veteranRookiesRevenue;

  const marketingDealRate = getMarketingDealRate(totalTeamActiveRevenue);

  // EARNINGS BREAKDOWN

  // Direct rookie override = Marketing Deal % - Rookie commission %
  const directRookieOverrideRate = marketingDealRate - ROOKIE_COMMISSION_RATE;
  const directRookieOverrideEarnings = directRookiesRevenue * directRookieOverrideRate;

  // Direct veteran override = Marketing Deal % - Veteran commission %
  const directVeteranOverrideRate = marketingDealRate - VETERAN_COMMISSION_RATE;
  const directVeteranOverrideEarnings = directVeteransRevenue * directVeteranOverrideRate;

  // Veteran-led rookies: override at veteran level (Marketing Deal % - Veteran commission %)
  const veteranRookiesOverrideEarnings = veteranRookiesRevenue * directVeteranOverrideRate;

  const leadershipEarnings = directRookieOverrideEarnings + directVeteranOverrideEarnings + veteranRookiesOverrideEarnings;

  // Personal earnings = (Marketing Deal % - Veteran commission %) on personal active revenue
  const personalEarningsRate = marketingDealRate - VETERAN_COMMISSION_RATE;
  const personalEarnings = includePersonal ? personalActiveRevenue * personalEarningsRate : 0;

  const totalEarnings = leadershipEarnings + personalEarnings;

  // Pass values up to parent
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        numDirectRookies,
        numDirectVeterans,
        rookiesPerVeteran,
        includePersonal,
        personalRevenue,
        totalTeamActiveRevenue,
        personalRate,
        personalEarnings,
      });
    }
  }, [numDirectRookies, numDirectVeterans, rookiesPerVeteran, includePersonal, personalRevenue, totalTeamActiveRevenue, personalRate, personalEarnings, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      {/* Warning/Disclaimer Box */}
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Calculations include a 20% cancellation rate on rookie contracts, 15% on veteran contracts, and an industry-low 25% rookie falloff (veterans do not fall off).</p>
            <p>Includes a 5% expense assumption on direct rookies only.</p>
            <p>Personal sales do not count toward your marketing deal.</p>
            <p>Veteran personal pay = Marketing Deal rate minus veteran commission rate.</p>
            <p>Direct rookie override = Marketing Deal rate minus rookie commission rate.</p>
          </div>
        </div>
      </div>

      {/* 1) PERSONAL PRODUCTION (FIRST) */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Personal Production</h4>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <label className="block text-sm font-medium text-foreground mb-1">
            Your Goal Active Revenue
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Returning reps nearly double their previous year's active revenue.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={personalRevenueStr}
            onChange={(e) => handleNumericChange(e.target.value, setPersonalRevenueStr)}
            className="input-field mb-3"
            placeholder="0"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Personal Rate: <span className="font-medium text-primary">{(personalRate * 100).toFixed(0)}%</span>
            </span>
            <span className="text-sm font-medium text-success">
              +{formatCurrency(personalEarnings)}
            </span>
          </div>
        </div>
      </div>

      {/* 2) DIRECT ROOKIES */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Rookies</h4>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Number of Direct Rookies (Summit AVG $220,000 each)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={numDirectRookiesStr}
            onChange={(e) => handleNumericChange(e.target.value, setNumDirectRookiesStr)}
            className="input-field"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Direct rookies revenue: {formatCurrency(directRookiesRevenue)}
          </p>
        </div>
      </div>

      {/* 3) DIRECT VETERANS */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Veterans</h4>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Number of Direct Veterans (Summit VET AVG $337,000 each)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={numDirectVeteransStr}
            onChange={(e) => handleNumericChange(e.target.value, setNumDirectVeteransStr)}
            className="input-field"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Direct veterans revenue: {formatCurrency(directVeteransRevenue)}
          </p>
        </div>
      </div>

      {/* 4) ROOKIES PER VETERAN */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Rookies Per Veteran</h4>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Rookies Per Veteran
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={rookiesPerVeteranStr}
            onChange={(e) => handleNumericChange(e.target.value, setRookiesPerVeteranStr)}
            className="input-field"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Veteran-led rookies revenue: {formatCurrency(veteranRookiesRevenue)}
          </p>
        </div>
      </div>

      {/* Results Summary */}
      <div className="p-6 rounded-lg bg-secondary/30 border border-border mb-6">
        <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Earnings Breakdown</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Team Active Revenue</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalTeamActiveRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Marketing Deal %</p>
            <p className="text-xl font-bold text-primary">{(marketingDealRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Leadership Earnings</p>
            <p className="text-xl font-bold text-success">{formatCurrency(leadershipEarnings)}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Personal Earnings</span>
            <span className="text-lg font-bold text-success">{formatCurrency(personalEarnings)}</span>
          </div>
        </div>
      </div>

      {/* Total Estimate */}
      <div className="p-6 rounded-lg bg-success/20 border-2 border-success mb-6">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-success" />
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Estimated Earnings</p>
        </div>
        <p className="text-4xl font-black text-success">{formatCurrency(totalEarnings)}</p>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>Leadership: {formatCurrency(leadershipEarnings)}</p>
          <p>Personal: {formatCurrency(personalEarnings)}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground mb-6">
        Estimates are simplified planning numbers and do not include cancellations, taxes, chargebacks, backend timing, or company-specific deductions.
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
