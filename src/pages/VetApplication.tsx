import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  yearsExperience: string;
  salesType: string;
  achievements: string;
  goals: string;
  availability: string;
}

const steps = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Experience" },
  { id: 3, title: "Goals" },
];

const VetApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    yearsExperience: "",
    salesType: "",
    achievements: "",
    goals: "",
    availability: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/");
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Application Submitted
          </h1>
          <p className="text-muted-foreground mb-8">
            Your veteran application is under review. Given your experience, we'll fast-track your review. Expect login credentials within 24 hours.
          </p>
          <button onClick={() => navigate("/")} className="btn-secondary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={handleBack}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Veteran Application
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {steps[currentStep - 1].title}
          </h1>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "bg-primary/20 text-primary border border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step.id < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card-elevated p-8 animate-fade-in">
          {currentStep === 1 && (
            <div className="space-y-6">
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current/Recent Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="Company Name"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Years in Sales
                </label>
                <select
                  value={formData.yearsExperience}
                  onChange={(e) => updateField("yearsExperience", e.target.value)}
                  className="input-field"
                >
                  <option value="">Select experience</option>
                  <option value="1-2">1-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Primary Sales Type
                </label>
                <select
                  value={formData.salesType}
                  onChange={(e) => updateField("salesType", e.target.value)}
                  className="input-field"
                >
                  <option value="">Select type</option>
                  <option value="b2b">B2B</option>
                  <option value="b2c">B2C</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="saas">SaaS</option>
                  <option value="retail">Retail</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Top Achievement
                </label>
                <textarea
                  value={formData.achievements}
                  onChange={(e) => updateField("achievements", e.target.value)}
                  placeholder="Describe your biggest sales win or achievement..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What do you want to improve?
                </label>
                <textarea
                  value={formData.goals}
                  onChange={(e) => updateField("goals", e.target.value)}
                  placeholder="What skills or areas are you looking to develop?"
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Availability
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => updateField("availability", e.target.value)}
                  className="input-field"
                >
                  <option value="">Select availability</option>
                  <option value="immediate">Start immediately</option>
                  <option value="1week">Within 1 week</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-8">
            <button onClick={handleNext} className="btn-primary">
              {currentStep === 3 ? "Submit Application" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VetApplication;
