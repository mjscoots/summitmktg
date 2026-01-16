import { useState } from "react";
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

interface VetCalculatorProps {
  onApplyClick?: () => void;
}

const VetCalculator = ({ onApplyClick }: VetCalculatorProps) => {
  // Team Structure
  const [numManagers, setNumManagers] = useState(2);
  const [repsPerManager, setRepsPerManager] = useState(5);
  const [avgRepRevenue, setAvgRepRevenue] = useState(150000);

  // Veteran Reps
  const [numVeteranReps, setNumVeteranReps] = useState(3);
  const [avgVeteranRevenue, setAvgVeteranRevenue] = useState(200000);

  // Personal Production
  const [includePersonal, setIncludePersonal] = useState(true);
  const [personalRevenue, setPersonalRevenue] = useState(250000);

  // Calculations
  const managedRepsRevenue = numManagers * repsPerManager * avgRepRevenue;
  const veteranRepsRevenue = numVeteranReps * avgVeteranRevenue;
  const totalTeamActiveRevenue = managedRepsRevenue + veteranRepsRevenue;

  const marketingDealRate = getMarketingDealRate(totalTeamActiveRevenue);
  const leadershipEarnings = totalTeamActiveRevenue * marketingDealRate;

  const personalRate = getPersonalRate(personalRevenue);
  const personalEarnings = includePersonal ? personalRevenue * personalRate : 0;

  const totalEarnings = leadershipEarnings + personalEarnings;

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
              type="number"
              value={numManagers}
              onChange={(e) => setNumManagers(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Reps per Manager
            </label>
            <input
              type="number"
              value={repsPerManager}
              onChange={(e) => setRepsPerManager(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Active Revenue per Rep
            </label>
            <input
              type="number"
              value={avgRepRevenue}
              onChange={(e) => setAvgRepRevenue(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field"
              min="0"
              step="10000"
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
              type="number"
              value={numVeteranReps}
              onChange={(e) => setNumVeteranReps(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Avg Active Revenue per Vet Rep
            </label>
            <input
              type="number"
              value={avgVeteranRevenue}
              onChange={(e) => setAvgVeteranRevenue(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field"
              min="0"
              step="10000"
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
              type="number"
              value={personalRevenue}
              onChange={(e) => setPersonalRevenue(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field mb-3"
              min="0"
              step="10000"
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
