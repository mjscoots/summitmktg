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
  videoReflection: string;
  personalCharacteristic: string;
  valueToTeam: string;
  motivation: string;
  salesThinking: string;
  selfDevelopment: string;
  scheduledInterview2: string;
  notes: string;
}

export default function Interview1Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    videoReflection: '',
    personalCharacteristic: '',
    valueToTeam: '',
    motivation: '',
    salesThinking: '',
    selfDevelopment: '',
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
        'Video Reflection': formData.videoReflection,
        'Personal Characteristic': formData.personalCharacteristic,
        'Value to Team': formData.valueToTeam,
        'Motivation': formData.motivation,
        'Sales Thinking': formData.salesThinking,
        'Self Development': formData.selfDevelopment,
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
                <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                  <span className="text-black font-bold text-lg">1</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 1</h1>
                  <p className="text-muted-foreground text-sm">Initial screening and background</p>
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
                  What stood out to you from the video?
                </label>
                <textarea
                  value={formData.videoReflection}
                  onChange={(e) => handleChange('videoReflection', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What's one personal characteristic you're most proud of?
                </label>
                <textarea
                  value={formData.personalCharacteristic}
                  onChange={(e) => handleChange('personalCharacteristic', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Outside of producing revenue, what value do you think you bring to a team?
                </label>
                <textarea
                  value={formData.valueToTeam}
                  onChange={(e) => handleChange('valueToTeam', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Why do you want to do this instead of something easier this summer?
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => handleChange('motivation', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  If you were consistently selling 2–3 a day but couldn't break past that, what would you change?
                </label>
                <textarea
                  value={formData.salesThinking}
                  onChange={(e) => handleChange('salesThinking', e.target.value)}
                  placeholder="Record their response..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What books or content are you currently consuming for self-development?
                </label>
                <textarea
                  value={formData.selfDevelopment}
                  onChange={(e) => handleChange('selfDevelopment', e.target.value)}
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
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
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
