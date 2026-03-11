import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageBackButton } from '@/components/shared/PageBackButton';
import {
  ScriptTip, ChecklistItem, QuestionCard,
  FieldLabel, FieldHint, YesNoToggle,
  inputClass, textareaClass,
} from '@/components/interviews/InterviewFormComponents';

interface FormData {
  recruitName: string;
  interviewerName: string;
  friendlyIntroDone: boolean;
  videoReaction: string;
  videoStuckOut: string;
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
}

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
    videoStuckOut: '',
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
  });

  useEffect(() => {
    if (profile?.full_name) setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
  }, [profile]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.recruitName.trim()) { toast.error('Please enter the recruit name'); return; }
    if (!formData.interviewerName.trim()) { toast.error('Please enter your name'); return; }

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];
      responses.push({
        id: crypto.randomUUID(), interviewee: formData.recruitName, interview: 1,
        interviewer: formData.interviewerName, submitted: new Date().toISOString(),
        data: {
          'Friendly Intro Done': formData.friendlyIntroDone ? 'Yes' : 'No',
          'Video Reaction': formData.videoReaction,
          'Video Stuck Out': formData.videoStuckOut,
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
        },
      });
      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));
      toast.success('Interview submitted');
      navigate('/app/interviews');
    } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app/interviews" label="Forms" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">1</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Summit: First Interview Call</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Character interview — building rapport</p>
          </div>
        </div>

        {/* Video Link */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/30 rounded-lg mb-8">
          <span className="flex-1 text-xs text-muted-foreground truncate">{interviewVideoLink}</span>
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <QuestionCard>
            <FieldLabel>Name of Recruit</FieldLabel>
            <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit's full name" className={inputClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Name of Interviewer</FieldLabel>
            <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Be friendly, ask how they're doing and how their day was.</p>
            <ChecklistItem checked={formData.friendlyIntroDone} onChange={() => handleChange('friendlyIntroDone', !formData.friendlyIntroDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel>What did you think of the video? What stuck out to you?</FieldLabel>
            <FieldHint>Key: Don't just leave it there, dig deep ask more questions to make sure they really watched it and understand the benefits. (Example question: how do you think gaining sales skills could potentially benefit you?)</FieldHint>
            <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What is your best characteristic?</FieldLabel>
            <textarea value={formData.bestCharacteristic} onChange={(e) => handleChange('bestCharacteristic', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Why do we want you, what value do you bring to us other than the ability to produce revenue?</FieldLabel>
            <textarea value={formData.whyWantYou} onChange={(e) => handleChange('whyWantYou', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Why would you want to join us and do this job?</FieldLabel>
            <textarea value={formData.whyJoinUs} onChange={(e) => handleChange('whyJoinUs', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What things have you done in your past that you're most proud of?</FieldLabel>
            <textarea value={formData.proudOf} onChange={(e) => handleChange('proudOf', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>If you were selling 2-3 a day consistently every day BUT you were having a hard time breaking past that 3 sale a day mark, what steps would you take to break past it?</FieldLabel>
            <textarea value={formData.breakPastPlateau} onChange={(e) => handleChange('breakPastPlateau', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What books are you currently reading on self development?</FieldLabel>
            <textarea value={formData.booksReading} onChange={(e) => handleChange('booksReading', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Any Questions?</FieldLabel>
            <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>After all questions are answered say this exactly:</FieldLabel>
            <FieldHint>"Before we go further, Is there anything that would make it that you wouldn't know if you could do this internship this summer, family trip, summer classes etc? Have you already talked to your parents about you being able to do an internship over the summer or do you make your own decisions?" Then: "Next Call we'll go over pay, hours, day to day. What's a good time for that second Call tomorrow?"</FieldHint>
            <textarea value={formData.closingStatement} onChange={(e) => handleChange('closingStatement', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Send them the video going over pay <span className="text-destructive">*</span></p>
            <ChecklistItem checked={formData.sentVideoDone} onChange={() => handleChange('sentVideoDone', !formData.sentVideoDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel>Did you schedule the next interview for tomorrow?</FieldLabel>
            <YesNoToggle value={formData.scheduledNextInterview} onChange={(v) => handleChange('scheduledNextInterview', v)} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Tell them have a great day</p>
            <ChecklistItem checked={formData.finalGoodbyeDone} onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)} label="Done" />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            ✈ {isSubmitting ? 'Submitting...' : 'Submit Interview 1'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
