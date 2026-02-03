import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap, Target, Users, Calendar, FileText, Mountain, Loader2 } from "lucide-react";
import RookieCalculator from "@/components/RookieCalculator";
import Testimonials, { rookieTestimonials } from "@/components/Testimonials";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      });

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
        description: "There was an error submitting your application. Please try again.",
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
              Rookie Path
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Estimate Your Earnings
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            See what's possible before you apply. Your results depend on your effort.
          </p>
        </div>

        {/* Calculator with Apply CTA */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <RookieCalculator onApplyClick={scrollToForm} />
        </div>

        {/* Why Different Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center uppercase tracking-wide">
            Why This Is Different
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

        {/* Testimonials with Video */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Testimonials 
            title="Rookie Results" 
            testimonials={rookieTestimonials} 
            showVideo={true}
            videoTitle="HEAR FROM ONE OF OUR FOUNDERS"
            videoUrl="https://youtu.be/7THjDkhxLP8"
          />
        </div>

        {/* Application Form */}
        <div ref={formRef} className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          {/* Electric Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Mountain className="w-6 h-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-wide">
                Ready to Run Your First Summer?
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
                disabled={!isFormComplete() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Apply as a Rookie
                    <ArrowRight className="w-4 h-4 ml-2" />
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
