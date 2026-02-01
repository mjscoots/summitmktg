import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FormData {
  recruitName: string;
  interviewerName: string;
  pros: string;
  cons: string;
  confidenceScale: string;
  pullBackResponse: string;
  outcome: 'offer' | 'disqualified' | '';
  notes: string;
}

export default function Interview3Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    pros: '',
    cons: '',
    confidenceScale: '',
    pullBackResponse: '',
    outcome: '',
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
    if (!formData.outcome) {
      toast.error('Please select an outcome');
      return;
    }

    // Save to localStorage
    const stored = localStorage.getItem('summit_interview_responses');
    const responses = stored ? JSON.parse(stored) : [];
    
    responses.push({
      id: crypto.randomUUID(),
      interviewee: formData.recruitName,
      interview: 3,
      interviewer: formData.interviewerName,
      submitted: new Date().toISOString(),
      data: {
        'Pros': formData.pros,
        'Cons': formData.cons,
        'Confidence Scale (1-10)': formData.confidenceScale,
        'Pull-Back Response': formData.pullBackResponse,
        'Final Outcome': formData.outcome === 'offer' ? 'Offer Extended' : 'Disqualified',
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
                <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 3</h1>
                  <p className="text-muted-foreground text-sm">Final decision and onboarding</p>
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
                  Give me 3–5 pros of doing this internship.
                </label>
                <textarea
                  value={formData.pros}
                  onChange={(e) => handleChange('pros', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Any real cons you're thinking about?
                </label>
                <textarea
                  value={formData.cons}
                  onChange={(e) => handleChange('cons', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  On a scale of 1–10, how ready are you to get started?
                </label>
                <select
                  value={formData.confidenceScale}
                  onChange={(e) => handleChange('confidenceScale', e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">Select...</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pull-Back Response (if applicable)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  "Based on this, it might make more sense for us to go with someone else."
                </p>
                <textarea
                  value={formData.pullBackResponse}
                  onChange={(e) => handleChange('pullBackResponse', e.target.value)}
                  placeholder="How did they respond?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Final Outcome *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'offer')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'offer'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-background text-muted-foreground border-border hover:border-green-500/50'
                    )}
                  >
                    Offer Extended
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'disqualified')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'disqualified'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-background text-muted-foreground border-border hover:border-red-500/50'
                    )}
                  >
                    Disqualified
                  </button>
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
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
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
