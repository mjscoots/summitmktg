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
    if (!formData.recruitName.trim()) { toast.error('Please enter the recruit name'); return; }
    if (!formData.interviewerName.trim()) { toast.error('Please enter your name'); return; }

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
              <span className="text-primary-foreground font-bold text-lg">1</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Character Interview</h1>
              <p className="text-muted-foreground text-xs mt-0.5">First connection — building rapport</p>
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

          {/* Intro */}
          <SectionHeader step={1}>Opening</SectionHeader>

          <ScriptTip label="Opening script">
            Be friendly, ask how they're doing and how their day was. Build genuine rapport before jumping into questions.
          </ScriptTip>

          <ChecklistItem checked={formData.friendlyIntroDone} onChange={() => handleChange('friendlyIntroDone', !formData.friendlyIntroDone)} label="Friendly intro completed" />

          {/* Character Questions */}
          <SectionHeader step={2}>Character Questions</SectionHeader>

          <QuestionCard>
            <FieldLabel>What did you think of the video? What stuck out?</FieldLabel>
            <ScriptTip label="Dig deeper">
              Don't just leave it there — ask more questions to make sure they really watched it. Example: "How do you think gaining sales skills could potentially benefit you?"
            </ScriptTip>
            <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>Best characteristic?</FieldLabel>
              <textarea value={formData.bestCharacteristic} onChange={(e) => handleChange('bestCharacteristic', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>What books are you reading?</FieldLabel>
              <textarea value={formData.booksReading} onChange={(e) => handleChange('booksReading', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <QuestionCard>
            <FieldLabel>Why do we want you? What value do you bring beyond revenue?</FieldLabel>
            <textarea value={formData.whyWantYou} onChange={(e) => handleChange('whyWantYou', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Why would you want to join us?</FieldLabel>
            <textarea value={formData.whyJoinUs} onChange={(e) => handleChange('whyJoinUs', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What in your past are you most proud of?</FieldLabel>
            <textarea value={formData.proudOf} onChange={(e) => handleChange('proudOf', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>If selling 2-3/day but stuck, what steps would you take to break past it?</FieldLabel>
            <textarea value={formData.breakPastPlateau} onChange={(e) => handleChange('breakPastPlateau', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Any questions?</FieldLabel>
            <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Record their questions..." rows={2} className={textareaClass} />
          </QuestionCard>

          {/* Closing */}
          <SectionHeader step={3}>Closing</SectionHeader>

          <ScriptTip label="Closing script">
            <em>"Before we go further, is there anything that would prevent you from doing this internship this summer — family trip, summer classes, etc.? Have you talked to your parents about being able to do an internship?"</em>
            <br /><br />
            Then: <em>"Next call we'll go over pay, hours, day to day. What's a good time for that second call tomorrow?"</em>
          </ScriptTip>

          <QuestionCard>
            <FieldLabel>Closing statement response</FieldLabel>
            <textarea value={formData.closingStatement} onChange={(e) => handleChange('closingStatement', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <div className="space-y-2">
            <ChecklistItem checked={formData.sentVideoDone} onChange={() => handleChange('sentVideoDone', !formData.sentVideoDone)} label="Pay video sent to recruit" />
          </div>

          <QuestionCard>
            <FieldLabel>Scheduled next interview for tomorrow?</FieldLabel>
            <YesNoToggle value={formData.scheduledNextInterview} onChange={(v) => handleChange('scheduledNextInterview', v)} />
          </QuestionCard>

          <ScriptTip label="Final step">Tell them to have a great day.</ScriptTip>

          <ChecklistItem checked={formData.finalGoodbyeDone} onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)} label="Final goodbye completed" />

          {/* Notes */}
          <div>
            <FieldLabel required={false}>Additional Notes</FieldLabel>
            <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any other observations..." rows={2} className={textareaClass} />
          </div>

          {/* Next step */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-3">Ready to schedule the next step?</p>
            <BookInterviewButton nextInterview={2} />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Interview 1'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
