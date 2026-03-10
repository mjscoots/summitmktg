import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2 } from 'lucide-react';
import { isMomentumComplete } from './BootcampMomentum';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { BootcampVideoUpload } from '@/components/bootcamp/BootcampVideoUpload';

const QUESTIONS = [
  'Your name',
  'Name of your manager',
  'On a scale of 1 to 10, what is your commitment to the office and to yourself?',
  'What do you want to say to yourself during weak moments when you want to quit?',
  "What's your best advice to yourself when facing a ton of adversity?",
  'What do you want us to say to you if you want to quit?',
  'Anything else you would like to say to yourself should you want to quit?',
];

export default function BootcampPhase1() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, isLoading, updatePhase } = useBootcamp();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isMomentumComplete()) {
      navigate('/bootcamp/momentum', { replace: true });
    }
    if (!isLoading && progress?.phase_1_complete) {
      navigate('/bootcamp/phase-2', { replace: true });
    }
  }, [isLoading, progress, navigate]);

  const handleUploadComplete = async (path: string) => {
    if (submitting) return;
    setSubmitting(true);
    const success = await updatePhase(1, { sunblock_video_url: path });
    if (success) {
      navigate('/bootcamp/phase-2', { replace: true });
    }
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <Breadcrumbs items={[
          { label: 'Summer Checklist', to: '/bootcamp/momentum' },
          { label: 'Phase 1' },
        ]} />
        <PhaseIndicator current={8} progress={progress} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            SUNBLOCK
          </h1>
          <p className="text-white/40 text-sm mb-6">STEP 8</p>

          <p className="text-white/60 text-sm mb-6">
            Please record yourself on your phone reading the following questions out loud and answering them.
          </p>

          <div className="text-white/40 text-xs mb-4 space-x-4">
            <span>• Good lighting</span>
            <span>• Voice is not muffled</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-6">
            <ul className="space-y-2">
              {QUESTIONS.map((q, i) => (
                <li key={i} className="text-white/50 text-sm flex items-start gap-2">
                  <span className="text-white/20 text-xs mt-0.5">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-white/50 text-sm mb-4">
            After recording, upload your video below to complete this module.
          </p>

          <BootcampVideoUpload
            userId={user?.id || ''}
            storagePath={`${user?.id}/sunblock`}
            onUploadComplete={handleUploadComplete}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ current, progress }: { current: number; progress: any }) {
  const steps = [
    { num: 8, label: 'SUNBLOCK', done: progress?.phase_1_complete },
    { num: 9, label: 'MOTIVATION', done: progress?.phase_2_complete },
    { num: 10, label: 'COMMITMENT', done: progress?.phase_3_complete },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                s.done ? 'bg-white text-black border-white' : s.num === current ? 'border-white text-white' : 'border-white/20 text-white/20'
              }`}
            >
              {s.done ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-[9px] mt-1 ${s.done || s.num === current ? 'text-white/60' : 'text-white/20'}`}>{s.label}</span>
          </div>
          {i < 2 && <div className={`w-12 h-0.5 mx-1 mb-4 ${s.done ? 'bg-white' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  );
}
