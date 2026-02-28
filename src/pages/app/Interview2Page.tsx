import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  ScriptTip, ChecklistItem, QuestionCard,
  FieldLabel, FieldHint,
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
  skipThirdNote: string;
  referralDone: boolean;
  parentsCheck: string;
  scheduleNextCall: string;
  addedToGethawxDone: boolean;
  anyQuestions: string;
  finalGoodbyeDone: boolean;
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
    skipThirdNote: '',
    referralDone: false,
    parentsCheck: '',
    scheduleNextCall: '',
    addedToGethawxDone: false,
    anyQuestions: '',
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
        id: crypto.randomUUID(), interviewee: formData.recruitName, interview: 2,
        interviewer: formData.interviewerName, submitted: new Date().toISOString(),
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
          'Skip Third Note': formData.skipThirdNote,
          'Referral Done': formData.referralDone ? 'Yes' : 'No',
          'Parents Check': formData.parentsCheck,
          'Schedule Next Call': formData.scheduleNextCall,
          'Added to Gethawx': formData.addedToGethawxDone ? 'Yes' : 'No',
          'Any Questions': formData.anyQuestions,
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
        <button onClick={() => navigate('/app/interviews')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /><span>Back to Forms</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">2</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Summit: Second Interview Call</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Be happy</p>
          </div>
        </div>

        {/* VIDEO label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-bold text-foreground">VIDEO</span>
        </div>

        {/* Video placeholder */}
        <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white/60 border-b-[12px] border-b-transparent ml-1" />
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
            <FieldLabel>Full name of Potential Recruit</FieldLabel>
            <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit's full name" className={inputClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Full name of Interviewer</FieldLabel>
            <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What did you think of the video? Do you understand how pay works or do you have any questions?</FieldLabel>
            <FieldHint>You understand upfront pay, October check and January check? (Dig deep here, don't just ask the 1 simple question and leave it there. Ask them examples to make sure they really understand. Example: Do you know the requirements to get an October check?)</FieldHint>
            <textarea value={formData.videoReaction} onChange={(e) => handleChange('videoReaction', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Any questions on the schedule or summer?</FieldLabel>
            <FieldHint>Read the schedule: Morning meeting 9:30-10:30 am, train/practice. Check area for next couple days and driving partners. Lunch then knock from 12-Dark. Saturday: quick 30 min meeting, brunch, knock 10:30-5:30 (most knock all day). Sunday off. Team events every other week. Mid summer lake trip possible.</FieldHint>
            <textarea value={formData.scheduleQuestions} onChange={(e) => handleChange('scheduleQuestions', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>How would you define giving a commitment?</FieldLabel>
            <textarea value={formData.commitmentDefinition} onChange={(e) => handleChange('commitmentDefinition', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What are examples of commitments you've given and kept even when you wanted to quit?</FieldLabel>
            <textarea value={formData.commitmentExamples} onChange={(e) => handleChange('commitmentExamples', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>How well do you think you'd do at something like this?</FieldLabel>
            <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What are two things that set you apart from the other candidates we have?</FieldLabel>
            <textarea value={formData.twoThingsApart} onChange={(e) => handleChange('twoThingsApart', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>How much revenue do you think you would close by summer's end?</FieldLabel>
            <FieldHint>Average Sales rep does 75k-150k.</FieldHint>
            <textarea value={formData.revenueGoal} onChange={(e) => handleChange('revenueGoal', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What do you see being your biggest threat to achieving your goals?</FieldLabel>
            <textarea value={formData.biggestThreat} onChange={(e) => handleChange('biggestThreat', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          {/* Work schedule confirmation */}
          <div>
            <p className="text-sm font-medium text-foreground">Work schedule confirmation</p>
            <FieldHint>Make reference to their goal from two questions before: "That is a big goal & it's very hard work to be successful in this job." Then Ask: A) What is your understanding of the daily work schedule? B) Do you have any problems working these long hours? Let them know typical season is May 1st through August 31st.</FieldHint>
            <ChecklistItem checked={formData.workScheduleDone} onChange={() => handleChange('workScheduleDone', !formData.workScheduleDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel required={false}>ONLY say this if you're not doing the 3rd interview: "I think you could be a good fit. So I'll put in a good word for you on this next interview."</FieldLabel>
            <textarea value={formData.skipThirdNote} onChange={(e) => handleChange('skipThirdNote', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          {/* Referral */}
          <div>
            <p className="text-sm font-medium text-foreground">Referral Request</p>
            <FieldHint>"One thing we've noticed is that new salesmen/interns always do better when they're having fun. You'll have an apartment with other salesmen/interns and what we have seen is that if you already know those people and they are people that motivate and drive you, then you'll sell more. Do you have anyone in mind that you feel like would do well and would also motivate and drive you to do better?" Get their number.</FieldHint>
            <ChecklistItem checked={formData.referralDone} onChange={() => handleChange('referralDone', !formData.referralDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel>A lot of young adults still go based on their parents calendar, do you need to check with them and have you talked with your parents or do you make your own decisions?</FieldLabel>
            <textarea value={formData.parentsCheck} onChange={(e) => handleChange('parentsCheck', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Schedule next call</FieldLabel>
            <FieldHint>Say this word for word: "Next call we're going over pros and cons, your goals and the company goals. This interview is more of an application to see if this is a good fit and at the end of it depending on where you're at and where we're at you might get an offer, make sure to talk with your parents or anyone else you might need to before this interview. What's a good time for our next meeting tomorrow?"</FieldHint>
            <textarea value={formData.scheduleNextCall} onChange={(e) => handleChange('scheduleNextCall', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Add them to gethawx as a prospect <span className="text-destructive">*</span></p>
            <ChecklistItem checked={formData.addedToGethawxDone} onChange={() => handleChange('addedToGethawxDone', !formData.addedToGethawxDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel>Any Questions?</FieldLabel>
            <textarea value={formData.anyQuestions} onChange={(e) => handleChange('anyQuestions', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Great have an awesome day, see you tomorrow.</p>
            <ChecklistItem checked={formData.finalGoodbyeDone} onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)} label="Done" />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            ✈ {isSubmitting ? 'Submitting...' : 'Submit Interview 2'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
