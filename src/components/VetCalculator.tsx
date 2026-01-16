import { useState } from "react";
import { DollarSign, Users, TrendingUp, User } from "lucide-react";
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

const EXPERIENCED_PERSONAL_TIERS = [
  { min: 0, max: 199999, rate: 0.30 },
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

const getPersonalRate = (revenue: number, isVeteran: boolean): number => {
  const tiers = isVeteran ? VETERAN_PERSONAL_TIERS : EXPERIENCED_PERSONAL_TIERS;
  const tier = tiers.find(t => revenue >= t.min && revenue <= t.max);
  return tier ? tier.rate : tiers[0].rate;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const VetCalculator = () => {
  const [numReps, setNumReps] = useState(5);
  const [avgRepRevenue, setAvgRepRevenue] = useState(150000);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [personalRevenue, setPersonalRevenue] = useState(200000);
  const [isVeteran, setIsVeteran] = useState(true);
  const [includeDirectRecruits, setIncludeDirectRecruits] = useState(false);
  const [directRecruitRevenue, setDirectRecruitRevenue] = useState(300000);

  // Calculations
  const teamActiveRevenue = numReps * avgRepRevenue;
  const marketingDealRate = getMarketingDealRate(teamActiveRevenue);
  const marketingDealEarnings = teamActiveRevenue * marketingDealRate;

  const personalRate = getPersonalRate(personalRevenue, isVeteran);
  const personalEarnings = includePersonal ? personalRevenue * personalRate : 0;

  const directRecruitOverride = includeDirectRecruits && !isVeteran ? directRecruitRevenue * 0.05 : 0;

  const totalEarnings = marketingDealEarnings + personalEarnings + directRecruitOverride;

  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Leadership Earnings Calculator</h3>
          <p className="text-sm text-muted-foreground">Estimate your marketing deal earnings</p>
        </div>
      </div>

      {/* Disclaimer at top */}
      <p className="text-xs text-muted-foreground mb-6">
        Leadership upside through your personal production + marketing deal. Estimates are simplified planning numbers.
      </p>

      {/* Rep Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">Your Background</label>
        <div className="flex gap-2">
          <button
            onClick={() => setIsVeteran(true)}
            className={`flex-1 px-4 py-3 rounded text-sm font-medium transition-colors ${
              isVeteran
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Veteran (D2D Pest)
          </button>
          <button
            onClick={() => setIsVeteran(false)}
            className={`flex-1 px-4 py-3 rounded text-sm font-medium transition-colors ${
              !isVeteran
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Experienced (Other Sales)
          </button>
        </div>
      </div>

      {/* Team Inputs */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Number of Reps You Plan to Bring
          </label>
          <input
            type="number"
            value={numReps}
            onChange={(e) => setNumReps(Math.max(0, parseInt(e.target.value) || 0))}
            className="input-field"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Avg Active Revenue Per Rep
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

      {/* Team Results */}
      <div className="p-4 rounded-lg bg-secondary/30 border border-border mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Team Active Revenue</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(teamActiveRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Marketing Deal %</p>
            <p className="text-lg font-bold text-primary">{(marketingDealRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gross Marketing Deal Estimate</p>
            <p className="text-lg font-bold text-success">{formatCurrency(marketingDealEarnings)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Higher deals available once maxed out.
        </p>
      </div>

      {/* Personal Production Toggle */}
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
        <div className="p-4 rounded-lg border border-border mb-4">
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

      {/* Direct Recruit Override (Experienced only) */}
      {!isVeteran && (
        <>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="recruit-toggle" className="text-sm font-medium">
                  Include Direct Recruit Override
                </Label>
                <p className="text-xs text-muted-foreground">5% on all direct recruits' production</p>
              </div>
            </div>
            <Switch
              id="recruit-toggle"
              checked={includeDirectRecruits}
              onCheckedChange={setIncludeDirectRecruits}
            />
          </div>

          {includeDirectRecruits && (
            <div className="p-4 rounded-lg border border-border mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Total Active Revenue from Direct Recruits
              </label>
              <input
                type="number"
                value={directRecruitRevenue}
                onChange={(e) => setDirectRecruitRevenue(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field mb-3"
                min="0"
                step="10000"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Override Rate: <span className="font-medium text-primary">5%</span>
                </span>
                <span className="text-sm font-medium text-success">
                  +{formatCurrency(directRecruitOverride)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Total Estimate */}
      <div className="p-6 rounded-lg bg-success/10 border border-success/20">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-success" />
          <p className="text-sm text-muted-foreground">Total Estimated Earnings</p>
        </div>
        <p className="text-3xl font-bold text-success">{formatCurrency(totalEarnings)}</p>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>Marketing Deal: {formatCurrency(marketingDealEarnings)}</p>
          {includePersonal && <p>Personal: {formatCurrency(personalEarnings)}</p>}
          {includeDirectRecruits && !isVeteran && <p>Direct Recruit Override: {formatCurrency(directRecruitOverride)}</p>}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground mt-4">
        Estimates are simplified planning numbers and do not include cancellations, taxes, chargebacks, backend timing, or company-specific deductions.
      </p>
    </div>
  );
};

export default VetCalculator;
