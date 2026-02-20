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
  videoReaction: string;
  payUnderstanding: string;
  scheduleQuestions: string;
  commitmentDefinition: string;
  commitmentExamples: string;
  howWellWouldYouDo: string;
  twoThingsApart: string;
  revenueGoal: string;
  biggestThreat: string;
  workScheduleDone: boolean;
  referralDone: boolean;
  referralName: string;
  referralPhone: string;
  parentsCheck: string;
  scheduleNextCall: string;
  addedToGethawxDone: boolean;
  anyQuestions: string;
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

export default function Interview2Page() {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interviewVideoLink = 'https://drive.google.com/file/d/1zjI04-xY-wdazHnVTn3CzU3MU8VbPk1t/view?usp=sharing';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(interviewVideoLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    videoReaction: '',
    payUnderstanding: '',
    scheduleQuestions: '',
    commitmentDefinition: '',
    commitmentExamples: '',
    howWellWouldYouDo: '',
    twoThingsApart: '',
    revenueGoal: '',
    biggestThreat: '',
    workScheduleDone: false,
    referralDone: false,
    referralName: '',
    referralPhone: '',
    parentsCheck: '',
    scheduleNextCall: '',
    addedToGethawxDone: false,
    anyQuestions: '',
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

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];

      responses.push({
        id: crypto.randomUUID(),
        interviewee: formData.recruitName,
        interview: 2,
        interviewer: formData.interviewerName,
        submitted: new Date().toISOString(),
        data: {
          'Video Reaction': formData.videoReaction,
          'Pay Understanding': formData.payUnderstanding,
          'Schedule Questions': formData.scheduleQuestions,
          'Commitment Definition': formData.commitmentDefinition,
          'Commitment Examples': formData.commitmentExamples,
          'How Well Would You Do': formData.howWellWouldYouDo,
          'Two Things Apart': formData.twoThingsApart,
          'Revenue Goal': formData.revenueGoal,
          'Biggest Threat': formData.biggestThreat,
          'Work Schedule Confirmed': formData.workScheduleDone ? 'Yes' : 'No',
          'Referral Done': formData.referralDone ? 'Yes' : 'No',
          'Referral Name': formData.referralName,
          'Referral Phone': formData.referralPhone,
          'Parents Check': formData.parentsCheck,
          'Schedule Next Call': formData.scheduleNextCall,
          'Added to Gethawx': formData.addedToGethawxDone ? 'Yes' : 'No',
          'Any Questions': formData.anyQuestions,
          'Final Goodbye Done': formData.finalGoodbyeDone ? 'Yes' : 'No',
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
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Interview 2</h1>
                    <p className="text-muted-foreground text-sm">Commitment check — digging deeper</p>
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
                  <label className="block text-sm font-medium text-foreground mb-2">Full name of Potential Recruit *</label>
                  <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit name" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full name of Interviewer *</label>
                  <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
                </div>
              </div>

              {/* Video & Pay */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What did you think of the video? Do you understand how pay works or do you have any questions? *</label>
                <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  You understand upfront pay, October check and January check? *
                </label>
                <ScriptTip>
                  Dig deep here, don't just ask the 1 simple question and leave it there. Ask them examples to make sure they really understand. Example: "Do you know the requirements to get an October check?"
                </ScriptTip>
                <textarea value={formData.payUnderstanding} onChange={(e) => handleChange('payUnderstanding', e.target.value)} placeholder="Record their response..." rows={3} className={cn(textareaClass, "mt-2")} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Any questions on the schedule or summer? *</label>
                <ScriptTip>
                  Read the schedule: Morning meeting 9:30-10:30 am, train/practice. Check area for next couple days and driving partners. Lunch then knock from 12-Dark. Saturday: quick 30 min meeting, brunch, knock 10:30-5:30 (most knock all day). Sunday off. Team events every other week. Mid summer lake trip possible.
                </ScriptTip>
                <textarea value={formData.scheduleQuestions} onChange={(e) => handleChange('scheduleQuestions', e.target.value)} placeholder="Record their response..." rows={3} className={cn(textareaClass, "mt-2")} />
              </div>

              {/* Core Questions */}
              <SectionHeader>Core Questions</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How would you define giving a commitment? *</label>
                <textarea value={formData.commitmentDefinition} onChange={(e) => handleChange('commitmentDefinition', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What are examples of commitments you've given and kept even when you wanted to quit? *</label>
                <textarea value={formData.commitmentExamples} onChange={(e) => handleChange('commitmentExamples', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How well do you think you'd do at something like this? *</label>
                <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What are two things that set you apart from the other candidates we have? *</label>
                <textarea value={formData.twoThingsApart} onChange={(e) => handleChange('twoThingsApart', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How much revenue do you think you would close by summer's end? *</label>
                <p className="text-xs text-muted-foreground mb-2">Average Sales rep does 75k-150k.</p>
                <textarea value={formData.revenueGoal} onChange={(e) => handleChange('revenueGoal', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What do you see being your biggest threat to achieving your goals? *</label>
                <textarea value={formData.biggestThreat} onChange={(e) => handleChange('biggestThreat', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              {/* Work Schedule Confirmation */}
              <SectionHeader>Work Schedule Confirmation</SectionHeader>

              <ScriptTip>
                Make reference to their goal from two questions before: <em>"That is a big goal & it's very hard work to be successful in this job."</em> Then Ask: A) What is your understanding of the daily work schedule? B) Do you have any problems working these long hours? Let them know typical season is May 1st through August 31st.
              </ScriptTip>

              <ChecklistItem
                checked={formData.workScheduleDone}
                onChange={() => handleChange('workScheduleDone', !formData.workScheduleDone)}
                label="Work schedule confirmation completed"
              />

              <ScriptTip>
                ONLY say this if you're not doing the 3rd interview: <em>"I think you could be a good fit. So I'll put in a good word for you on this next interview."</em>
              </ScriptTip>

              {/* Referral Request */}
              <SectionHeader>Referral Request</SectionHeader>

              <ScriptTip>
                "One thing we've noticed is that new salesmen/interns always do better when they're having fun. You'll have an apartment with other salesmen/interns and what we have seen is that if you already know those people and they are people that motivate and drive you, then you'll sell more. Do you have anyone in mind that you feel like would do well and would also motivate and drive you to do better?" Get their number.
              </ScriptTip>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Referral Name</label>
                  <input type="text" value={formData.referralName} onChange={(e) => handleChange('referralName', e.target.value)} placeholder="Name..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                  <input type="tel" value={formData.referralPhone} onChange={(e) => handleChange('referralPhone', formatPhoneNumber(e.target.value))} placeholder="(555) 123-4567" className={inputClass} />
                </div>
              </div>

              <ChecklistItem
                checked={formData.referralDone}
                onChange={() => handleChange('referralDone', !formData.referralDone)}
                label="Referral request completed"
              />

              {/* Parents & Scheduling */}
              <SectionHeader>Closing</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  A lot of young adults still go based on their parents calendar, do you need to check with them and have you talked with your parents or do you make your own decisions? *
                </label>
                <textarea value={formData.parentsCheck} onChange={(e) => handleChange('parentsCheck', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Schedule next call *</label>
                <ScriptTip>
                  Say this word for word: <em>"Next call we're going over pros and cons, your goals and the company goals. This interview is more of an application to see if this is a good fit and at the end of it depending on where you're at and where we're at you might get an offer, make sure to talk with your parents or anyone else you might need to before this interview. What's a good time for our next meeting tomorrow?"</em>
                </ScriptTip>
                <input type="text" value={formData.scheduleNextCall} onChange={(e) => handleChange('scheduleNextCall', e.target.value)} placeholder="e.g. Tomorrow at 4pm EST" className={cn(inputClass, "mt-2")} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Add them to gethawx as a prospect *</label>
                <ChecklistItem
                  checked={formData.addedToGethawxDone}
                  onChange={() => handleChange('addedToGethawxDone', !formData.addedToGethawxDone)}
                  label="Added to gethawx as a prospect"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Any Questions? *</label>
                <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Record their questions..." rows={2} className={textareaClass} />
              </div>

              <ScriptTip>Great have an awesome day, see you tomorrow.</ScriptTip>

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
                <p className="text-sm text-muted-foreground mb-3">Ready to schedule the final interview?</p>
                <BookInterviewButton nextInterview={3} />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interview 2'}
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
