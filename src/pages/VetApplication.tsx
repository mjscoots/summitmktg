import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users, Target, Trophy, TrendingUp, Settings, Mountain, Play, DollarSign } from "lucide-react";
import VetCalculator, { VetCalculatorValues } from "@/components/VetCalculator";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  cityState: string;
  lastSeasonRevenue: string;
  intendedMarket: string;
  referralName: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  cityState?: string;
  lastSeasonRevenue?: string;
  intendedMarket?: string;
  referralName?: string;
}

const VetApplication = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    lastSeasonRevenue: "",
    intendedMarket: "",
    referralName: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    fullName: false,
    email: false,
    phone: false,
    cityState: false,
    lastSeasonRevenue: false,
    intendedMarket: false,
    referralName: false,
  });

  const RequiredAsterisk = () => <span className="text-destructive ml-1">*</span>;

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    if (field === "email" && value.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
      }
    }
    if (value.trim() === "") {
      const fieldLabels: Record<keyof FormData, string> = {
        fullName: "Full Name",
        email: "Email Address",
        phone: "Phone Number",
        cityState: "City, State",
        lastSeasonRevenue: "Last Season Revenue",
        intendedMarket: "Previously Knocked Markets",
        referralName: "Who did you hear about us from",
      };
      return `${fieldLabels[field]} is required`;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const fields: (keyof FormData)[] = [
      "fullName",
      "email",
      "phone",
      "cityState",
      "lastSeasonRevenue",
      "intendedMarket",
      "referralName",
    ];
    
    const newErrors: FormErrors = {};
    let isValid = true;

    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      cityState: true,
      lastSeasonRevenue: true,
      intendedMarket: true,
      referralName: true,
    });

    return isValid;
  };

  const isFormComplete = (): boolean => {
    return (
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.cityState.trim() !== "" &&
      formData.lastSeasonRevenue.trim() !== "" &&
      formData.intendedMarket.trim() !== "" &&
      formData.referralName.trim() !== ""
    );
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      navigate("/apply/success");
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [calcValues, setCalcValues] = useState<VetCalculatorValues | null>(null);

  const handleCalcValuesChange = useCallback((values: VetCalculatorValues) => {
    setCalcValues(values);
  }, []);

  // Competitor calculator logic - 30% retention, 10% direct override
  const COMPETITOR_RETENTION_RATE = 0.30;
  const COMPETITOR_OVERRIDE_RATE = 0.10;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate competitor earnings based on Summit calculator inputs
  const DIRECT_ROOKIE_AVG_REVENUE = 220000;
  const DIRECT_VETERAN_AVG_REVENUE = 337000;
  
  const getCompetitorEarnings = () => {
    if (!calcValues) return { teamRevenue: 0, overrideEarnings: 0, personalEarnings: 0, totalEarnings: 0 };
    
    // Direct rookies (apply 30% retention for competitor structure)
    const finishedDirectRookies = Math.floor(calcValues.numDirectRookies * COMPETITOR_RETENTION_RATE);
    const directRookieTeamRevenue = finishedDirectRookies * DIRECT_ROOKIE_AVG_REVENUE;
    
    // Direct veterans (no retention adjustment - they're vets)
    const directVetTeamRevenue = calcValues.numDirectVeterans * DIRECT_VETERAN_AVG_REVENUE;
    
    // Veteran-led rookies (apply 30% retention for competitor structure)
    const totalVeteranRookies = calcValues.numDirectVeterans * calcValues.rookiesPerVeteran;
    const finishedVeteranRookies = Math.floor(totalVeteranRookies * COMPETITOR_RETENTION_RATE);
    const veteranRookieTeamRevenue = finishedVeteranRookies * DIRECT_ROOKIE_AVG_REVENUE;
    
    // Total team revenue after retention
    const teamRevenue = directRookieTeamRevenue + directVetTeamRevenue + veteranRookieTeamRevenue;
    
    // 10% direct override
    const overrideEarnings = teamRevenue * COMPETITOR_OVERRIDE_RATE;
    
    // Personal production (same rate logic for comparison)
    const personalEarnings = calcValues.includePersonal ? calcValues.personalEarnings : 0;
    
    const totalEarnings = overrideEarnings + personalEarnings;
    
    return { 
      directRookies: calcValues.numDirectRookies,
      finishedDirectRookies,
      directRookieTeamRevenue,
      directVetTeamRevenue,
      totalVeteranRookies,
      finishedVeteranRookies,
      veteranRookieTeamRevenue,
      teamRevenue, 
      overrideEarnings, 
      personalEarnings, 
      totalEarnings 
    };
  };

  const competitorEarnings = getCompetitorEarnings();
  const summitUpside = [
    { icon: Users, title: "Instant Marketing Deal", description: "Plug directly into a marketing deal structure designed for scale, not capped overrides." },
    { icon: Target, title: "Elite Training", description: "Direct training from a Golden Door record holder (56 days) and a recruiting record holder (1,000 reps in one off-season)." },
    { icon: Trophy, title: "Full Commission on Mosquito", description: "Earn full commission percentage on mosquito contracts." },
    { icon: TrendingUp, title: "Uncapped Recruiting", description: "You will never be capped on how many people you want to bring out." },
    { icon: Settings, title: "Elite Systems for Vets", description: "AI-generated neighborhoods, pre-cut and optimized for efficiency, plus full access to CRM and recruiting software — all provided free to veterans on day one." },
    { icon: DollarSign, title: "Top-tier pay structure", description: "Higher commissions, scalable overrides, and a marketing deal structure designed for long-term upside." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mountain className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Veteran Path
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4 tracking-wider">
            CALCULATE YOUR <span className="text-primary">EARNINGS</span>
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto mb-4 rounded-full" />
          <p className="text-muted-foreground max-w-xl mx-auto">
            Put your goals in and see your estimated earnings based on Summit Marketing's veteran pay scale and marketing deal structure.
          </p>
        </div>

        {/* Calculator with Apply CTA */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <VetCalculator onApplyClick={scrollToForm} onValuesChange={handleCalcValuesChange} />
        </div>

        {/* Competitor Earnings Calculator - Auto-filled from Summit inputs */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="card-elevated p-6 md:p-8 bg-secondary/20">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-wide mb-2">
                Estimated Earnings on a Direct Override Structure
              </h3>
              <p className="text-sm text-muted-foreground">
                Auto-calculated using your inputs above
              </p>
            </div>

            {calcValues && (calcValues.numDirectRookies > 0 || calcValues.numDirectVeterans > 0) ? (
              <>
                {/* Your Inputs */}
                <div className="space-y-3 mb-6">
                  <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Inputs (from Summit Calculator)</h5>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex justify-between">
                      <span>Direct Rookies:</span>
                      <span className="font-medium">{calcValues.numDirectRookies}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Direct Veterans:</span>
                      <span className="font-medium">{calcValues.numDirectVeterans}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Rookies per Veteran:</span>
                      <span className="font-medium">{calcValues.rookiesPerVeteran}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total Veteran-led Rookies:</span>
                      <span className="font-medium">{competitorEarnings.totalVeteranRookies}</span>
                    </li>
                  </ul>
                </div>

                {/* Competitor Adjustments */}
                <div className="space-y-3 mb-6 p-4 rounded-lg bg-secondary/30 border border-border">
                  <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Competitor Structure Adjustments</h5>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex justify-between">
                      <span>Rookie retention rate:</span>
                      <span className="font-medium">30%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Finished direct rookies:</span>
                      <span className="font-medium">{competitorEarnings.finishedDirectRookies}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Finished veteran-led rookies:</span>
                      <span className="font-medium">{competitorEarnings.finishedVeteranRookies}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Override structure:</span>
                      <span className="font-medium">10% direct only</span>
                    </li>
                  </ul>
                </div>

                {/* Calculated Outputs */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Direct rookie revenue (after 30% retention):</span>
                    <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.directRookieTeamRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Direct veteran revenue:</span>
                    <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.directVetTeamRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Veteran-led rookie revenue (after 30% retention):</span>
                    <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.veteranRookieTeamRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total active team revenue:</span>
                    <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.teamRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Direct override earnings (10%):</span>
                    <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.overrideEarnings)}</span>
                  </div>
                  {calcValues.includePersonal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Personal production earnings:</span>
                      <span className="font-medium text-foreground">{formatCurrency(competitorEarnings.personalEarnings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="font-semibold text-foreground">Total Estimated Competitor Earnings:</span>
                    <span className="text-2xl font-black text-foreground">{formatCurrency(competitorEarnings.totalEarnings)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Enter values in the Summit Veteran Calculator above to see your estimated competitor earnings.</p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center mt-6 pt-4 border-t border-border">
              Competitor pay scale shown for structural comparison only. This comparison uses your own inputs to illustrate how different compensation structures affect earnings. Competitor assumptions are simplified and shown for structural comparison only.
            </p>
          </div>
        </div>

        {/* Summit Upside Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center uppercase tracking-wide">
            Summit Upside
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summitUpside.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Veteran Results - Video Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Mountain className="w-5 h-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-wide">
                Hear From Vets Who've Done This Before
              </h2>
              <Mountain className="w-5 h-5 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              Experienced reps explaining why they switched and scaled at Summit.
            </p>
          </div>
          
          <div className="card-elevated p-6 md:p-8">
            <div className="relative aspect-video bg-secondary/50 rounded-lg overflow-hidden border border-border">
              {!isVideoPlaying ? (
                <button 
                  onClick={() => setIsVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Play className="w-6 h-6 text-primary-foreground ml-1" />
                  </div>
                </button>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {/* Replace with actual video embed */}
                  <p className="text-sm">Video player placeholder</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div ref={formRef} className="mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {/* Electric Header - matching Rookie styling */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Mountain className="w-6 h-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-wide">
                Ready to Run It Back?
              </h2>
              <Mountain className="w-6 h-6 text-primary" />
            </div>
            <div className="w-24 h-1 bg-primary mx-auto mb-3 rounded-full" />
            <p className="text-muted-foreground text-sm uppercase tracking-wide">
              Apply below to get the process started.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="card-elevated p-6 md:p-8">
            <p className="text-sm text-muted-foreground mb-6">
              <span className="text-destructive">*</span> All fields are required
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name<RequiredAsterisk />
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  onBlur={() => handleBlur("fullName")}
                  placeholder="John Smith"
                  className={`input-field ${touched.fullName && errors.fullName ? 'border-destructive' : ''}`}
                  required
                />
                {touched.fullName && errors.fullName && (
                  <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number<RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  placeholder="(555) 123-4567"
                  className={`input-field ${touched.phone && errors.phone ? 'border-destructive' : ''}`}
                  required
                />
                {touched.phone && errors.phone && (
                  <p className="text-destructive text-sm mt-1">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address<RequiredAsterisk />
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="john@example.com"
                  className={`input-field ${touched.email && errors.email ? 'border-destructive' : ''}`}
                  required
                />
                {touched.email && errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  City, State<RequiredAsterisk />
                </label>
                <input
                  type="text"
                  value={formData.cityState}
                  onChange={(e) => updateField("cityState", e.target.value)}
                  onBlur={() => handleBlur("cityState")}
                  placeholder="Phoenix, AZ"
                  className={`input-field ${touched.cityState && errors.cityState ? 'border-destructive' : ''}`}
                  required
                />
                {touched.cityState && errors.cityState && (
                  <p className="text-destructive text-sm mt-1">{errors.cityState}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Season Revenue<RequiredAsterisk />
                </label>
                <input
                  type="text"
                  value={formData.lastSeasonRevenue}
                  onChange={(e) => updateField("lastSeasonRevenue", e.target.value)}
                  onBlur={() => handleBlur("lastSeasonRevenue")}
                  placeholder="$150,000"
                  className={`input-field ${touched.lastSeasonRevenue && errors.lastSeasonRevenue ? 'border-destructive' : ''}`}
                  required
                />
                {touched.lastSeasonRevenue && errors.lastSeasonRevenue && (
                  <p className="text-destructive text-sm mt-1">{errors.lastSeasonRevenue}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Previously Knocked Markets<RequiredAsterisk />
                </label>
                <input
                  type="text"
                  value={formData.intendedMarket}
                  onChange={(e) => updateField("intendedMarket", e.target.value)}
                  onBlur={() => handleBlur("intendedMarket")}
                  placeholder="List the markets you've knocked before (city/state)"
                  className={`input-field ${touched.intendedMarket && errors.intendedMarket ? 'border-destructive' : ''}`}
                  required
                />
                {touched.intendedMarket && errors.intendedMarket && (
                  <p className="text-destructive text-sm mt-1">{errors.intendedMarket}</p>
                )}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Who did you hear about us from?<RequiredAsterisk />
              </label>
              <input
                type="text"
                value={formData.referralName}
                onChange={(e) => updateField("referralName", e.target.value)}
                onBlur={() => handleBlur("referralName")}
                placeholder="Enter the name of the person who referred you or the account you saw"
                className={`input-field ${touched.referralName && errors.referralName ? 'border-destructive' : ''}`}
                required
              />
              {touched.referralName && errors.referralName && (
                <p className="text-destructive text-sm mt-1">{errors.referralName}</p>
              )}
            </div>
            <div className="flex justify-end">
              <button 
                type="submit" 
                className="btn-primary uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isFormComplete()}
              >
                Apply Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default VetApplication;
