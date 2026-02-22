import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BookInterviewButton } from '@/components/interviews/BookInterviewButton';
import {
  ScriptTip, ChecklistItem, SectionHeader, QuestionCard,
  FieldLabel, FieldHint, YesNoToggle,
  inputClass, textareaClass,
} from '@/components/interviews/InterviewFormComponents';

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
    if (!formData.recruitName.trim()) { toast.error('Please enter the recruit name'); return; }
    if (!formData.interviewerName.trim()) { toast.error('Please enter your name'); return; }

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
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <AppLayout>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button onClick={() => navigate('/app/interviews')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Interviews</span>
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">2</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Pay & Goals Interview</h1>
              <p className="text-muted-foreground text-xs mt-0.5">Commitment check — digging deeper</p>
            </div>
          </div>
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 rounded-lg transition-colors border border-primary/20">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Video Link'}
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Recruit Name</FieldLabel>
              <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit name" className={inputClass} />
            </div>
            <div>
              <FieldLabel>Interviewer</FieldLabel>
              <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
            </div>
          </div>

          {/* Video & Pay */}
          <SectionHeader step={1}>Video & Pay Understanding</SectionHeader>

          <QuestionCard>
            <FieldLabel>What did you think of the video? Do you understand how pay works?</FieldLabel>
            <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Do you understand upfront pay, October check and January check?</FieldLabel>
            <ScriptTip label="Go deeper">
              Don't just ask one question. Ask examples: "Do you know the requirements to get an October check?"
            </ScriptTip>
            <textarea value={formData.payUnderstanding} onChange={(e) => handleChange('payUnderstanding', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Any questions on the schedule or summer?</FieldLabel>
            <ScriptTip label="Schedule details">
              Morning meeting 9:30-10:30, train/practice. Lunch then knock 12-Dark. Saturday: 30 min meeting, brunch, knock 10:30-5:30. Sunday off. Team events every other week.
            </ScriptTip>
            <textarea value={formData.scheduleQuestions} onChange={(e) => handleChange('scheduleQuestions', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          {/* Core Questions */}
          <SectionHeader step={2}>Commitment & Drive</SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>How would you define giving a commitment?</FieldLabel>
              <textarea value={formData.commitmentDefinition} onChange={(e) => handleChange('commitmentDefinition', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Commitments you've kept even when you wanted to quit?</FieldLabel>
              <textarea value={formData.commitmentExamples} onChange={(e) => handleChange('commitmentExamples', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>How well would you do at this?</FieldLabel>
              <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Two things that set you apart?</FieldLabel>
              <textarea value={formData.twoThingsApart} onChange={(e) => handleChange('twoThingsApart', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <QuestionCard>
            <FieldLabel>Revenue goal by summer's end?</FieldLabel>
            <FieldHint>Average sales rep does 75k-150k.</FieldHint>
            <textarea value={formData.revenueGoal} onChange={(e) => handleChange('revenueGoal', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Biggest threat to achieving your goals?</FieldLabel>
            <textarea value={formData.biggestThreat} onChange={(e) => handleChange('biggestThreat', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          {/* Work Schedule */}
          <SectionHeader step={3}>Schedule & Logistics</SectionHeader>

          <ScriptTip label="Work schedule confirmation">
            Reference their goal: "That's a big goal & it's very hard work." Then ask: A) What's your understanding of the daily work schedule? B) Any problems working long hours? Typical season: May 1 – Aug 31.
          </ScriptTip>

          <ChecklistItem checked={formData.workScheduleDone} onChange={() => handleChange('workScheduleDone', !formData.workScheduleDone)} label="Work schedule confirmation completed" />

          <ScriptTip label="If skipping interview 3">
            ONLY say this if you're not doing the 3rd interview: "I think you could be a good fit. So I'll put in a good word for you on this next interview."
          </ScriptTip>

          {/* Referral */}
          <SectionHeader step={4}>Referral Request</SectionHeader>

          <ScriptTip label="Referral script">
            "New salesmen always do better with people they know. Do you have anyone in mind that would motivate and drive you?" Get their number.
          </ScriptTip>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel required={false}>Referral Name</FieldLabel>
              <input type="text" value={formData.referralName} onChange={(e) => handleChange('referralName', e.target.value)} placeholder="Name..." className={inputClass} />
            </div>
            <div>
              <FieldLabel required={false}>Phone Number</FieldLabel>
              <input type="tel" value={formData.referralPhone} onChange={(e) => handleChange('referralPhone', formatPhoneNumber(e.target.value))} placeholder="(555) 123-4567" className={inputClass} />
            </div>
          </div>

          <ChecklistItem checked={formData.referralDone} onChange={() => handleChange('referralDone', !formData.referralDone)} label="Referral request completed" />

          {/* Closing */}
          <SectionHeader step={5}>Closing</SectionHeader>

          <QuestionCard>
            <FieldLabel>Do you need to check with your parents or do you make your own decisions?</FieldLabel>
            <textarea value={formData.parentsCheck} onChange={(e) => handleChange('parentsCheck', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Schedule next call</FieldLabel>
            <ScriptTip label="Closing script">
              "Next call: pros & cons, your goals and company goals. This interview is more of an application. At the end you might get an offer. Talk to your parents before. What's a good time tomorrow?"
            </ScriptTip>
            <input type="text" value={formData.scheduleNextCall} onChange={(e) => handleChange('scheduleNextCall', e.target.value)} placeholder="e.g. Tomorrow at 4pm EST" className={inputClass} />
          </QuestionCard>

          <div className="space-y-2">
            <ChecklistItem checked={formData.addedToGethawxDone} onChange={() => handleChange('addedToGethawxDone', !formData.addedToGethawxDone)} label="Added to gethawx as a prospect" />
          </div>

          <QuestionCard>
            <FieldLabel>Any questions?</FieldLabel>
            <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Record their questions..." rows={2} className={textareaClass} />
          </QuestionCard>

          <ScriptTip label="Final step">Great, have an awesome day. See you tomorrow.</ScriptTip>

          <ChecklistItem checked={formData.finalGoodbyeDone} onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)} label="Final goodbye completed" />

          {/* Notes */}
          <div>
            <FieldLabel required={false}>Additional Notes</FieldLabel>
            <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any other observations..." rows={2} className={textareaClass} />
          </div>

          {/* Next step */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-3">Ready to schedule the final interview?</p>
            <BookInterviewButton nextInterview={3} />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Interview 2'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
