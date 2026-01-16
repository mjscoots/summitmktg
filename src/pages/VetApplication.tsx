import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users, Target, Trophy, TrendingUp, Settings, Mountain } from "lucide-react";
import VetCalculator from "@/components/VetCalculator";
import Testimonials, { vetTestimonials } from "@/components/Testimonials";

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
        intendedMarket: "Favorite or Previously Knocked Markets",
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

  const leadershipUpside = [
    { icon: Users, text: "Build a squad" },
    { icon: Target, text: "Training system + accountability" },
    { icon: Trophy, text: "Leaderboards + competition" },
    { icon: TrendingUp, text: "Scale through recruitment" },
    { icon: Settings, text: "Simple operating system" },
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Estimate Your Earnings
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Leadership upside through your personal production + marketing deal.
          </p>
        </div>

        {/* Calculator with Apply CTA */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <VetCalculator onApplyClick={scrollToForm} />
        </div>

        {/* Leadership Upside Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center uppercase tracking-wide">
            Leadership Upside
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {leadershipUpside.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div ref={formRef} className="mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
                  Favorite or Previously Knocked Markets<RequiredAsterisk />
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

        {/* Testimonials */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <Testimonials title="Veteran Results" testimonials={vetTestimonials} />
        </div>
      </main>
    </div>
  );
};

export default VetApplication;
