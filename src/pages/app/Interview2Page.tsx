import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  recruitName: string;
  interviewerName: string;
  payUnderstanding: string;
  scheduleReality: string;
  commitmentDefinition: string;
  selfBelief: string;
  uniqueEdge: string;
  revenueVision: string;
  biggestObstacle: string;
  referralName: string;
  referralPhone: string;
  notes: string;
}

export default function Interview2Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    payUnderstanding: '',
    scheduleReality: '',
    commitmentDefinition: '',
    selfBelief: '',
    uniqueEdge: '',
    revenueVision: '',
    biggestObstacle: '',
    referralName: '',
    referralPhone: '',
    notes: '',
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleSubmit = () => {
    if (!formData.recruitName.trim()) {
      toast.error('Please enter the recruit name');
      return;
    }
    if (!formData.interviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    // Save to localStorage
    const stored = localStorage.getItem('summit_interview_responses');
    const responses = stored ? JSON.parse(stored) : [];
    
    responses.push({
      id: crypto.randomUUID(),
      interviewee: formData.recruitName,
      interview: 2,
      interviewer: formData.interviewerName,
      submitted: new Date().toISOString(),
      data: {
        'Pay Understanding': formData.payUnderstanding,
        'Schedule Reality': formData.scheduleReality,
        'Commitment Definition': formData.commitmentDefinition,
        'Self Belief': formData.selfBelief,
        'Unique Edge': formData.uniqueEdge,
        'Revenue Vision': formData.revenueVision,
        'Biggest Obstacle': formData.biggestObstacle,
        'Referral Name': formData.referralName,
        'Referral Phone': formData.referralPhone,
        'Notes': formData.notes,
      },
    });
    
    localStorage.setItem('summit_interview_responses', JSON.stringify(responses));
    
    toast.success('Interview submitted');
    navigate('/app/interviews');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/app/interviews')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Interviews</span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 2</h1>
                  <p className="text-muted-foreground text-sm">Commitment check — digging deeper</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recruit Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.recruitName}
                    onChange={(e) => handleChange('recruitName', e.target.value)}
                    placeholder="Enter recruit name"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Interviewer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.interviewerName}
                    onChange={(e) => handleChange('interviewerName', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Psychology-Driven Questions */}
              
              {/* Knowledge check - easy start */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Walk me through how you understand the pay structure.
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Comprehension check: Did they actually pay attention?
                </p>
                <textarea
                  value={formData.payUnderstanding}
                  onChange={(e) => handleChange('payUnderstanding', e.target.value)}
                  placeholder="Record their explanation..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Reality check - goes deeper */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What part of the daily grind do you think will test you the most?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Self-awareness: Do they understand what they're signing up for?
                </p>
                <textarea
                  value={formData.scheduleReality}
                  onChange={(e) => handleChange('scheduleReality', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Values question - meaningful */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What does commitment actually mean to you — not the dictionary definition, your definition.
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Identity-based: Gets past surface-level answers
                </p>
                <textarea
                  value={formData.commitmentDefinition}
                  onChange={(e) => handleChange('commitmentDefinition', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Confidence builder */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Honestly — do you think you'd actually be good at this? Why?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Confidence check: Let them sell themselves
                </p>
                <textarea
                  value={formData.selfBelief}
                  onChange={(e) => handleChange('selfBelief', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Differentiation - pattern interrupt */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  If I'm choosing between you and 5 other candidates, what's the thing that makes you different?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Pattern interrupt: Forces authentic differentiation
                </p>
                <textarea
                  value={formData.uniqueEdge}
                  onChange={(e) => handleChange('uniqueEdge', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Vision question - future pacing */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What number are you genuinely shooting for this summer? And what makes you believe you can hit it?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Future-pacing: Tests ambition and realism
                </p>
                <input
                  type="text"
                  value={formData.revenueVision}
                  onChange={(e) => handleChange('revenueVision', e.target.value)}
                  placeholder="e.g., $100,000 because..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              {/* Obstacle awareness - ends with self-reflection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What's the thing most likely to get in your way? Be real.
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Self-awareness: Acknowledging weakness = coachable
                </p>
                <textarea
                  value={formData.biggestObstacle}
                  onChange={(e) => handleChange('biggestObstacle', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Referral */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-border/50">
                <p className="text-sm text-foreground font-medium">
                  "Is there someone in your circle who'd push you to be better out here?"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Referral Name
                    </label>
                    <input
                      type="text"
                      value={formData.referralName}
                      onChange={(e) => handleChange('referralName', e.target.value)}
                      placeholder="Name..."
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.referralPhone}
                      onChange={(e) => handleChange('referralPhone', formatPhoneNumber(e.target.value))}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any other observations..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
              >
                Submit Interview
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}