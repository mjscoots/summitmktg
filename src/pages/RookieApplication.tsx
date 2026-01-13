import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  motivation: string;
  availability: string;
  referral: string;
}

const steps = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Background" },
  { id: 3, title: "Commitment" },
];

const RookieApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    motivation: "",
    availability: "",
    referral: "",
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
            Your rookie application is under review. You'll receive login credentials via email once approved.
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
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Rookie Application
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
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
                      ? "bg-gradient-primary text-primary-foreground"
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="City, State"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Any sales experience?
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) => updateField("experience", e.target.value)}
                  className="input-field"
                >
                  <option value="">Select an option</option>
                  <option value="none">No experience</option>
                  <option value="retail">Retail/Customer Service</option>
                  <option value="some">Some sales (less than 1 year)</option>
                  <option value="other">Other relevant experience</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Why do you want to get into sales?
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => updateField("motivation", e.target.value)}
                  placeholder="Tell us what drives you..."
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
                  When can you start?
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => updateField("availability", e.target.value)}
                  className="input-field"
                >
                  <option value="">Select availability</option>
                  <option value="immediate">Immediately</option>
                  <option value="1week">Within 1 week</option>
                  <option value="2weeks">Within 2 weeks</option>
                  <option value="1month">Within 1 month</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How did you hear about us?
                </label>
                <select
                  value={formData.referral}
                  onChange={(e) => updateField("referral", e.target.value)}
                  className="input-field"
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

export default RookieApplication;
