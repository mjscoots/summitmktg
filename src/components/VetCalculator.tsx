import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, User, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  numManagers: number;
  repsPerManager: number;
  avgRepRevenue: number;
  numVeteranReps: number;
  avgVeteranRevenue: number;
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
  // Team Structure - use string state to handle empty inputs properly
  const [numManagersStr, setNumManagersStr] = useState("");
  const [repsPerManagerStr, setRepsPerManagerStr] = useState("");
  const [avgRepRevenueStr, setAvgRepRevenueStr] = useState("");

  // Veteran Reps
  const [numVeteranRepsStr, setNumVeteranRepsStr] = useState("");
  const [avgVeteranRevenueStr, setAvgVeteranRevenueStr] = useState("");

  // Personal Production
  const [includePersonal, setIncludePersonal] = useState(true);
  const [personalRevenueStr, setPersonalRevenueStr] = useState("");

  // Parse string values to numbers (empty string = 0 for calculations)
  const numManagers = parseFormattedNumber(numManagersStr);
  const repsPerManager = parseFormattedNumber(repsPerManagerStr);
  const avgRepRevenue = parseFormattedNumber(avgRepRevenueStr);
  const numVeteranReps = parseFormattedNumber(numVeteranRepsStr);
  const avgVeteranRevenue = parseFormattedNumber(avgVeteranRevenueStr);
  const personalRevenue = parseFormattedNumber(personalRevenueStr);

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

  // Calculations
  const managedRepsRevenue = numManagers * repsPerManager * avgRepRevenue;
  const veteranRepsRevenue = numVeteranReps * avgVeteranRevenue;
  const totalTeamActiveRevenue = managedRepsRevenue + veteranRepsRevenue;

  const marketingDealRate = getMarketingDealRate(totalTeamActiveRevenue);
  const leadershipEarnings = totalTeamActiveRevenue * marketingDealRate;

  const personalRate = getPersonalRate(personalRevenue);
  const personalEarnings = includePersonal ? personalRevenue * personalRate : 0;

  const totalEarnings = leadershipEarnings + personalEarnings;

  // Pass values up to parent
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        numManagers,
        repsPerManager,
        avgRepRevenue,
        numVeteranReps,
        avgVeteranRevenue,
        includePersonal,
        personalRevenue,
        totalTeamActiveRevenue,
        personalRate,
        personalEarnings,
      });
    }
  }, [numManagers, repsPerManager, avgRepRevenue, numVeteranReps, avgVeteranRevenue, includePersonal, personalRevenue, totalTeamActiveRevenue, personalRate, personalEarnings, onValuesChange]);

  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Veteran Earnings Calculator</h3>
          <p className="text-sm text-muted-foreground">Estimate your marketing deal + personal earnings</p>
        </div>
      </div>

      {/* Disclaimer at top */}
      <p className="text-xs text-muted-foreground mb-6">
        Veterans expect complexity and scale. This calculator reflects your full earning potential.
      </p>

      {/* Team Structure Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Team Structure</h4>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Number of Managers
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={numManagersStr}
              onChange={(e) => handleNumericChange(e.target.value, setNumManagersStr)}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Reps per Manager
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={repsPerManagerStr}
              onChange={(e) => handleNumericChange(e.target.value, setRepsPerManagerStr)}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Active Revenue per Rep
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={avgRepRevenueStr}
              onChange={(e) => handleNumericChange(e.target.value, setAvgRepRevenueStr)}
              className="input-field"
              placeholder="0"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Managed reps revenue: {formatCurrency(managedRepsRevenue)}
        </p>
      </div>

      {/* Veteran Reps Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Veteran Reps You're Bringing</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Number of Veteran Reps
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={numVeteranRepsStr}
              onChange={(e) => handleNumericChange(e.target.value, setNumVeteranRepsStr)}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Active Revenue per Vet Rep
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={avgVeteranRevenueStr}
              onChange={(e) => handleNumericChange(e.target.value, setAvgVeteranRevenueStr)}
              className="input-field"
              placeholder="0"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Veteran reps revenue: {formatCurrency(veteranRepsRevenue)}
        </p>
      </div>

      {/* Personal Production Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 mb-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <div>
              <Label htmlFor="personal-toggle" className="text-sm font-medium">
                Include Personal Production
              </Label>
              <p className="text-xs text-muted-foreground">Add your own sales to the estimate</p>
            </div>
          </div>
          <Switch
            id="personal-toggle"
            checked={includePersonal}
            onCheckedChange={setIncludePersonal}
          />
        </div>

        {includePersonal && (
          <div className="p-4 rounded-lg border border-border">
            <label className="block text-sm font-medium text-foreground mb-2">
              Your Personal Active Revenue
            </label>
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
        )}
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
        {includePersonal && (
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Personal Earnings</span>
              <span className="text-lg font-bold text-success">{formatCurrency(personalEarnings)}</span>
            </div>
          </div>
        )}
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
          {includePersonal && <p>Personal: {formatCurrency(personalEarnings)}</p>}
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
