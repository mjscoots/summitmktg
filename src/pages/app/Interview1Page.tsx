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
  firstImpression: string;
  proudMoment: string;
  teamValue: string;
  whyHard: string;
  overcomingPlateau: string;
  growthMindset: string;
  scheduledInterview2: string;
  notes: string;
}

export default function Interview1Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    firstImpression: '',
    proudMoment: '',
    teamValue: '',
    whyHard: '',
    overcomingPlateau: '',
    growthMindset: '',
    scheduledInterview2: '',
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
      interview: 1,
      interviewer: formData.interviewerName,
      submitted: new Date().toISOString(),
      data: {
        'First Impression': formData.firstImpression,
        'Proud Moment': formData.proudMoment,
        'Team Value': formData.teamValue,
        'Why Hard Work': formData.whyHard,
        'Overcoming Plateau': formData.overcomingPlateau,
        'Growth Mindset': formData.growthMindset,
        'Interview 2 Scheduled': formData.scheduledInterview2,
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
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 1</h1>
                  <p className="text-muted-foreground text-sm">First connection — building rapport</p>
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

              {/* Psychology-Driven Questions - Dopamine Curve */}
              
              {/* Easy opener - builds confidence */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What caught your attention about this opportunity?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Easy opener: Let them share what excited them
                </p>
                <textarea
                  value={formData.firstImpression}
                  onChange={(e) => handleChange('firstImpression', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Pride question - builds them up */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tell me about a moment you're genuinely proud of — something that took real effort.
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Social proof: Let them prove their worth to themselves
                </p>
                <textarea
                  value={formData.proudMoment}
                  onChange={(e) => handleChange('proudMoment', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Value question - goes deeper */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Beyond just selling — what would you bring to a team culture?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Identity question: How do they see themselves contributing?
                </p>
                <textarea
                  value={formData.teamValue}
                  onChange={(e) => handleChange('teamValue', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Challenge question - pattern interrupt */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Why choose something hard when you could do something easy this summer?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Pattern interrupt: Cuts through rehearsed answers
                </p>
                <textarea
                  value={formData.whyHard}
                  onChange={(e) => handleChange('whyHard', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Problem-solving - tests mindset */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  If you hit a wall and couldn't break past it, what would you actually change?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Reveals problem-solving approach and coachability
                </p>
                <textarea
                  value={formData.overcomingPlateau}
                  onChange={(e) => handleChange('overcomingPlateau', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Growth mindset - ends on high note */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What are you actively doing to become better — books, podcasts, mentors?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Growth indicator: Are they already investing in themselves?
                </p>
                <textarea
                  value={formData.growthMindset}
                  onChange={(e) => handleChange('growthMindset', e.target.value)}
                  placeholder="Record their response..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Interview 2 Scheduled?
                </label>
                <select
                  value={formData.scheduledInterview2}
                  onChange={(e) => handleChange('scheduledInterview2', e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
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