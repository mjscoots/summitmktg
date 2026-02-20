import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, Copy, Check, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BookInterviewButton } from '@/components/interviews/BookInterviewButton';

interface FormData {
  recruitName: string;
  interviewerName: string;
  friendlyIntroDone: boolean;
  videoReaction: string;
  bestCharacteristic: string;
  whyWantYou: string;
  whyJoinUs: string;
  proudOf: string;
  breakPastPlateau: string;
  booksReading: string;
  anyQuestions: string;
  closingStatement: string;
  sentVideoDone: boolean;
  scheduledNextInterview: string;
  finalGoodbyeDone: boolean;
  notes: string;
}

function ScriptTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-muted-foreground leading-relaxed">
      <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function ChecklistItem({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex items-center gap-3 w-full text-left p-3 rounded-lg border transition-all",
        checked
          ? "bg-success/10 border-success/30 text-foreground"
          : "bg-background border-border hover:border-primary/30 text-muted-foreground"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
        checked ? "bg-success border-success" : "border-border"
      )}>
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-6 pb-2 border-t border-border/50 first:border-t-0 first:pt-0">
      <h2 className="text-base font-bold text-foreground">{children}</h2>
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
const textareaClass = `${inputClass} resize-none`;

export default function Interview1Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interviewVideoLink = 'https://drive.google.com/file/d/1b12LAcdRY9rvUC_CcT0cpUyyPD-GuxSN/view?usp=drive_link';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(interviewVideoLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    friendlyIntroDone: false,
    videoReaction: '',
    bestCharacteristic: '',
    whyWantYou: '',
    whyJoinUs: '',
    proudOf: '',
    breakPastPlateau: '',
    booksReading: '',
    anyQuestions: '',
    closingStatement: '',
    sentVideoDone: false,
    scheduledNextInterview: '',
    finalGoodbyeDone: false,
    notes: '',
  });

  useEffect(() => {
    if (profile?.full_name) {
      setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
    }
  }, [profile]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
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

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];

      responses.push({
        id: crypto.randomUUID(),
        interviewee: formData.recruitName,
        interview: 1,
        interviewer: formData.interviewerName,
        submitted: new Date().toISOString(),
        data: {
          'Friendly Intro Done': formData.friendlyIntroDone ? 'Yes' : 'No',
          'Video Reaction': formData.videoReaction,
          'Best Characteristic': formData.bestCharacteristic,
          'Why We Want You': formData.whyWantYou,
          'Why Join Us': formData.whyJoinUs,
          'Proud Of': formData.proudOf,
          'Break Past Plateau': formData.breakPastPlateau,
          'Books Reading': formData.booksReading,
          'Any Questions': formData.anyQuestions,
          'Closing Statement': formData.closingStatement,
          'Sent Video': formData.sentVideoDone ? 'Yes' : 'No',
          'Scheduled Next Interview': formData.scheduledNextInterview,
          'Final Goodbye': formData.finalGoodbyeDone ? 'Yes' : 'No',
          'Notes': formData.notes,
        },
      });

      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));
      toast.success('Interview submitted');
      navigate('/app/interviews');
    } finally {
      setIsSubmitting(false);
    }
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Interview 1</h1>
                    <p className="text-muted-foreground text-sm">First connection — building rapport</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl space-y-6">
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name of Recruit *</label>
                  <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit name" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name of Interviewer *</label>
                  <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
                </div>
              </div>

              {/* Friendly intro */}
              <div>
                <p className="text-sm text-foreground mb-2">Be friendly, ask how they're doing and how their day was.</p>
                <ChecklistItem
                  checked={formData.friendlyIntroDone}
                  onChange={() => handleChange('friendlyIntroDone', !formData.friendlyIntroDone)}
                  label="Friendly intro completed"
                />
              </div>

              {/* Interview Questions */}
              <SectionHeader>Interview Questions</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What did you think of the video? What stuck out to you? *</label>
                <ScriptTip>
                  Don't just leave it there, dig deep ask more questions to make sure they really watched it and understand the benefits. Example question: "How do you think gaining sales skills could potentially benefit you?"
                </ScriptTip>
                <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Record their response..." rows={3} className={cn(textareaClass, "mt-2")} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What is your best characteristic? *</label>
                <textarea value={formData.bestCharacteristic} onChange={(e) => handleChange('bestCharacteristic', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Why do we want you, what value do you bring to us other than the ability to produce revenue? *</label>
                <textarea value={formData.whyWantYou} onChange={(e) => handleChange('whyWantYou', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Why would you want to join us and do this job? *</label>
                <textarea value={formData.whyJoinUs} onChange={(e) => handleChange('whyJoinUs', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What things have you done in your past that you're most proud of? *</label>
                <textarea value={formData.proudOf} onChange={(e) => handleChange('proudOf', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  If you were selling 2-3 a day consistently every day BUT you were having a hard time breaking past that 3 sale a day mark, what steps would you take to break past it? *
                </label>
                <textarea value={formData.breakPastPlateau} onChange={(e) => handleChange('breakPastPlateau', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What books are you currently reading on self development? *</label>
                <textarea value={formData.booksReading} onChange={(e) => handleChange('booksReading', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Any Questions? *</label>
                <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Record their questions..." rows={2} className={textareaClass} />
              </div>

              {/* Closing */}
              <SectionHeader>Closing</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">After all questions are answered say this exactly: *</label>
                <ScriptTip>
                  <em>"Before we go further, Is there anything that would make it that you wouldn't know if you could do this internship this summer, family trip, summer classes etc? Have you already talked to your parents about you being able to do an internship over the summer or do you make your own decisions?"</em>
                  <br /><br />
                  Then: <em>"Next Call we'll go over pay, hours, day to day. What's a good time for that second Call tomorrow?"</em>
                </ScriptTip>
                <textarea value={formData.closingStatement} onChange={(e) => handleChange('closingStatement', e.target.value)} placeholder="Record their response..." rows={3} className={cn(textareaClass, "mt-2")} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Send them the video going over pay *</label>
                <ChecklistItem
                  checked={formData.sentVideoDone}
                  onChange={() => handleChange('sentVideoDone', !formData.sentVideoDone)}
                  label="Pay video sent to recruit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Did you schedule the next interview for tomorrow? *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('scheduledNextInterview', 'yes')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border text-sm',
                      formData.scheduledNextInterview === 'yes'
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-background text-muted-foreground border-border hover:border-success/50'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('scheduledNextInterview', 'no')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border text-sm',
                      formData.scheduledNextInterview === 'no'
                        ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : 'bg-background text-muted-foreground border-border hover:border-destructive/50'
                    )}
                  >
                    No — I will tell my manager
                  </button>
                </div>
              </div>

              <ScriptTip>Tell them have a great day.</ScriptTip>

              <ChecklistItem
                checked={formData.finalGoodbyeDone}
                onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)}
                label="Final goodbye — told them to have a great day"
              />

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Additional Notes</label>
                <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any other observations..." rows={3} className={textareaClass} />
              </div>

              {/* Book Next Interview CTA */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Ready to schedule the next step?</p>
                <BookInterviewButton nextInterview={2} />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interview 1'}
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
