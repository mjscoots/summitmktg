import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap, Target, Users, Calendar, FileText, Mountain } from "lucide-react";
import RookieCalculator from "@/components/RookieCalculator";
import Testimonials, { rookieTestimonials } from "@/components/Testimonials";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  cityState: string;
  salesExperience: string;
  referralSource: string;
}

const RookieApplication = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    salesExperience: "",
    referralSource: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/apply/success");
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

        {/* Application Form */}
        <div ref={formRef} className="mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Mountain className="w-4 h-4 text-primary/40" />
            <h2 className="text-2xl font-bold text-foreground text-center uppercase tracking-wide">
              Apply as a Rookie
            </h2>
            <Mountain className="w-4 h-4 text-primary/40" />
          </div>
          
          <form onSubmit={handleSubmit} className="card-elevated p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="John Smith"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  City, State
                </label>
                <input
                  type="text"
                  value={formData.cityState}
                  onChange={(e) => updateField("cityState", e.target.value)}
                  placeholder="Phoenix, AZ"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Any Sales Experience?
                </label>
                <select
                  value={formData.salesExperience}
                  onChange={(e) => updateField("salesExperience", e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How Did You Hear About Us?
                </label>
                <select
                  value={formData.referralSource}
                  onChange={(e) => updateField("referralSource", e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select an option</option>
                  <option value="social">Social Media</option>
                  <option value="friend">Friend/Colleague</option>
                  <option value="search">Google Search</option>
                  <option value="ad">Advertisement</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary uppercase tracking-wide">
                Apply as a Rookie
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        </div>

        {/* Testimonials with Video */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <Testimonials 
            title="Rookie Results" 
            testimonials={rookieTestimonials} 
            showVideo={true}
            videoTitle="WATCH WHAT A SUMMER AT SUMMIT LOOKS LIKE"
            videoSubtext="Real reps. Real results. Four months of door-to-door."
          />
        </div>
      </main>
    </div>
  );
};

export default RookieApplication;
