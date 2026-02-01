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
  scheduleChallenge: string;
  commitmentDefinition: string;
  selfAssessment: string;
  differentiation: string;
  revenueGoal: string;
  biggestThreat: string;
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
    scheduleChallenge: '',
    commitmentDefinition: '',
    selfAssessment: '',
    differentiation: '',
    revenueGoal: '',
    biggestThreat: '',
    referralName: '',
    referralPhone: '',
    notes: '',
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        'Schedule Challenge': formData.scheduleChallenge,
        'Commitment Definition': formData.commitmentDefinition,
        'Self Assessment': formData.selfAssessment,
        'Differentiation': formData.differentiation,
        'Revenue Goal': formData.revenueGoal,
        'Biggest Threat': formData.biggestThreat,
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
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 2</h1>
                  <p className="text-muted-foreground text-sm">Commitment, schedule, and work ethic</p>
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

              {/* Questions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Explain how upfront pay, October checks, and January checks work.
                </label>
                <textarea
                  value={formData.payUnderstanding}
                  onChange={(e) => handleChange('payUnderstanding', e.target.value)}
                  placeholder="Record their explanation..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What part of the schedule do you think will challenge you the most?
                </label>
                <textarea
                  value={formData.scheduleChallenge}
                  onChange={(e) => handleChange('scheduleChallenge', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How would you personally define commitment?
                </label>
                <textarea
                  value={formData.commitmentDefinition}
                  onChange={(e) => handleChange('commitmentDefinition', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How well do you think you'd actually do at something like this?
                </label>
                <textarea
                  value={formData.selfAssessment}
                  onChange={(e) => handleChange('selfAssessment', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What are two things that separate you from other candidates?
                </label>
                <textarea
                  value={formData.differentiation}
                  onChange={(e) => handleChange('differentiation', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  By the end of the summer, how much revenue do you realistically think you'd close?
                </label>
                <input
                  type="text"
                  value={formData.revenueGoal}
                  onChange={(e) => handleChange('revenueGoal', e.target.value)}
                  placeholder="e.g., $100,000"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What do you see as your biggest threat to achieving that goal?
                </label>
                <textarea
                  value={formData.biggestThreat}
                  onChange={(e) => handleChange('biggestThreat', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Referral */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <p className="text-sm text-muted-foreground">
                  "Is there anyone you know who would push you to be better?"
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
                      onChange={(e) => handleChange('referralPhone', e.target.value)}
                      placeholder="(555) 555-5555"
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
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
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
