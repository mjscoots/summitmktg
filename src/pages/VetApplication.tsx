import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users, Target, Trophy, TrendingUp, Settings, Mountain, DollarSign, Loader2 } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import VetCalculator, { VetCalculatorValues } from "@/components/VetCalculator";
import IndustryStep, { useApplicationSource } from "@/components/apply/IndustryStep";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { setPageMeta } from "@/lib/pageMeta";

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
  useEffect(() => {
    setPageMeta({
      title: "Apply as a Veteran - Summit Marketing",
      description:
        "Apply to run a summer season with Summit as an experienced sales rep.",
      path: "/apply/veteran",
    });
  }, []);

  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const { vertical, setVertical, source } = useApplicationSource();
  const [verticalError, setVerticalError] = useState<string | undefined>();
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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vertical) {
      setVerticalError("Pick one");
      return;
    }
    setVerticalError(undefined);
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-application", {
        body: {
          application_type: "vet",
          full_name: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          city_state: formData.cityState.trim(),
          referral_source: formData.referralName.trim(),
          previous_company: formData.intendedMarket.trim(),
          years_experience: formData.lastSeasonRevenue.replace(/[^0-9]/g, ''),
          vertical: vertical === "unsure" ? null : vertical,
          source_type: source.source_type,
          source_code: source.source_code,
          referrer_user_id: source.referrer_user_id,
          partner_id: source.partner_id,
          website: honeypot,
        },
      });

      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error || "rejected");
      }

      // Send welcome email (fire and forget - don't block submission)
      const firstName = formData.fullName.trim().split(" ")[0];
      supabase.functions.invoke("send-welcome-email", {
        body: {
          email: formData.email.trim().toLowerCase(),
          firstName,
          applicationType: "vet",
        },
      }).catch((emailError) => {
        console.error("Welcome email failed:", emailError);
        // Don't show error to user - email is non-critical
      });

      navigate("/apply/success");
    } catch (error) {
      console.error("Application submission error:", error);
      toast({
        title: "Submission Failed",
        description: "That did not go through. Check the phone and email and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [calcValues, setCalcValues] = useState<VetCalculatorValues | null>(null);
  void calcValues; // Used for future features

  const handleCalcValuesChange = useCallback((values: VetCalculatorValues) => {
    setCalcValues(values);
  }, []);

  const summitUpside = [
    { icon: Users, title: "Instant Marketing Deal", description: "Plug directly into a marketing deal structure designed for scale, not capped overrides." },
    { icon: Target, title: "Training", description: "Direct training from a Golden Door record holder (56 days) and a hiring record holder (1,000 reps in one off-season)." },
    { icon: Trophy, title: "Full Commission on Mosquito", description: "Earn full commission percentage on mosquito contracts." },
    { icon: TrendingUp, title: "Uncapped team building", description: "You will never be capped on how many people you want to bring out." },
    { icon: Settings, title: "Systems for Vets", description: "AI-generated neighborhoods, pre-cut and optimized for efficiency, plus full access to CRM and hiring software - all provided free to veterans on day one." },
    { icon: DollarSign, title: "Scalable Structure", description: "Scalable overrides and a marketing deal structure designed for long-term upside." },
  ];

  return (
    <div className="gold-world min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="-ml-2 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-sm text-text-muted">Sold before</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Veteran application
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            Set your numbers, then send the form. We talk terms on the call.
          </p>
        </div>

        {/* Calculator with Apply CTA */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <VetCalculator onApplyClick={scrollToForm} onValuesChange={handleCalcValuesChange} />
        </div>

        {/* Summit Upside Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-foreground">
            What you get here
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
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              From the founders
            </h2>
          </div>
          
          <div className="card-elevated p-6 md:p-8">
            <VideoPlayer 
              src="https://youtu.be/TTQe2NKXHYQ" 
              title="Hear From One Of Our Founders" 
            />
          </div>
        </div>

        {/* Application Form */}
        <div ref={formRef} className="mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {/* Electric Header - matching Rookie styling */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Your application
            </h2>
            <p className="mt-2 text-sm text-text-secondary">All fields are required.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 pb-24 sm:pb-0">
            {/* Hidden from people, filled only by bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />
            <section className="public-surface p-5 sm:p-6">
              <IndustryStep value={vertical} onChange={setVertical} error={verticalError} />
            </section>

            <section className="public-surface p-5 sm:p-6">
              <h2 className="mb-4 text-base font-extrabold text-foreground">About you and your history</h2>
              <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full name<RequiredAsterisk />
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
                  Phone number<RequiredAsterisk />
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
                  Email address<RequiredAsterisk />
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
                  Last season revenue<RequiredAsterisk />
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
                  Previously knocked markets<RequiredAsterisk />
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
            </section>

            <section className="public-surface p-5 sm:p-6">
              <h2 className="mb-4 text-base font-extrabold text-foreground">How you heard about us</h2>
              <label className="block text-sm font-medium text-foreground mb-2">
                Who did you hear about us from?<RequiredAsterisk />
              </label>
              <input
                type="text"
                value={formData.referralName}
                onChange={(e) => updateField("referralName", e.target.value)}
                onBlur={() => handleBlur("referralName")}
                placeholder="The person who referred you, or the account you saw"
                className={`input-field ${touched.referralName && errors.referralName ? 'border-destructive' : ''}`}
                required
              />
              {touched.referralName && errors.referralName && (
                <p className="text-destructive text-sm mt-1">{errors.referralName}</p>
              )}
            </section>

            {/* Pinned on the phone, inline from sm up. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:flex sm:justify-end">
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={!isFormComplete() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    Submit application
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default VetApplication;
