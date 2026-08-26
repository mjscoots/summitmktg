import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap, Target, Users, Calendar, FileText, Mountain, Loader2 } from "lucide-react";
import EarningsCalculator from "@/components/EarningsCalculator";
import IndustryStep, { useApplicationSource } from "@/components/apply/IndustryStep";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { setPageMeta } from "@/lib/pageMeta";
interface FormData {
  fullName: string;
  email: string;
  phone: string;
  cityState: string;
  referralName: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  cityState?: string;
  referralName?: string;
}

const RookieApplication = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { vertical, setVertical, source } = useApplicationSource();

  useEffect(() => {
    setPageMeta({
      title: "Apply as a Rookie — Summit Marketing",
      description:
        "Apply for a summer sales season with Summit. First-time reps start here.",
      path: "/apply/rookie",
    });
  }, []);
  const [verticalError, setVerticalError] = useState<string | undefined>();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    referralName: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    fullName: false,
    email: false,
    phone: false,
    cityState: false,
    referralName: false,
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    if (!value.trim()) {
      const fieldLabels: Record<keyof FormData, string> = {
        fullName: "Full Name",
        email: "Email Address",
        phone: "Phone Number",
        cityState: "City, State",
        referralName: "Who did you hear about us from",
      };
      const error = `${fieldLabels[field]} is required`;
      setErrors((prev) => ({ ...prev, [field]: error }));
      return error;
    }
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      const error = "Please enter a valid email address";
      setErrors((prev) => ({ ...prev, [field]: error }));
      return error;
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    return undefined;
  };

  const validateForm = (): boolean => {
    const fields: (keyof FormData)[] = [
      "fullName",
      "email",
      "phone",
      "cityState",
      "referralName",
    ];
    
    let isValid = true;
    const newErrors: FormErrors = {};
    const newTouched: Record<keyof FormData, boolean> = { ...touched };
    
    fields.forEach((field) => {
      newTouched[field] = true;
      const value = formData[field];
      if (!value.trim()) {
        const fieldLabels: Record<keyof FormData, string> = {
          fullName: "Full Name",
          email: "Email Address",
          phone: "Phone Number",
          cityState: "City, State",
          referralName: "Who did you hear about us from",
        };
        newErrors[field] = `${fieldLabels[field]} is required`;
        isValid = false;
      } else if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field] = "Please enter a valid email address";
        isValid = false;
      }
    });
    
    setTouched(newTouched);
    setErrors(newErrors);
    return isValid;
  };

  const isFormComplete = (): boolean => {
    return (
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.cityState.trim() !== "" &&
      formData.referralName.trim() !== ""
    );
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
      const { error } = await supabase.from("applications").insert({
        application_type: "rookie",
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        city_state: formData.cityState.trim(),
        referral_source: formData.referralName.trim(),
        vertical: vertical === "unsure" ? null : vertical,
        source_type: source.source_type,
        source_code: source.source_code,
        referrer_user_id: source.referrer_user_id,
        partner_id: source.partner_id,
      } as never);

      if (error) throw error;

      // Send welcome email (fire and forget - don't block submission)
      const firstName = formData.fullName.trim().split(" ")[0];
      supabase.functions.invoke("send-welcome-email", {
        body: {
          email: formData.email.trim().toLowerCase(),
          firstName,
          applicationType: "rookie",
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

  const whyDifferent = [
    { icon: Calendar, text: "Four-month sprint" },
    { icon: Target, text: "High-income upside" },
    { icon: FileText, text: "Clear training roadmap" },
    { icon: Users, text: "Team culture + competition" },
    { icon: Zap, text: "Simple schedule, repeatable scripts" },
    { icon: Target, text: "You're paid on performance, not the clock." },
  ];

  const RequiredAsterisk = () => <span className="text-destructive ml-1">*</span>;

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
          <p className="text-sm text-text-muted">First season</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Apply for a season
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            Run the numbers, then send the form. A manager calls you after that.
          </p>
        </div>

        {/* Calculator with Apply CTA */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <EarningsCalculator onApplyClick={scrollToForm} />
        </div>

        {/* Why Different Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-foreground">
            What the job is
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {whyDifferent.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div ref={formRef} className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          {/* Electric Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Your application
            </h2>
            <p className="mt-2 text-sm text-text-secondary">All fields are required.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 pb-24 sm:pb-0">
            <section className="public-surface p-5 sm:p-6">
              <IndustryStep value={vertical} onChange={setVertical} error={verticalError} />
            </section>

            <section className="public-surface p-5 sm:p-6">
              <h2 className="mb-4 text-base font-extrabold text-foreground">About you</h2>
              <div className="grid gap-5 md:grid-cols-2">
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

export default RookieApplication;
