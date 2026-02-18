import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ChevronRight, Zap, Target, Heart, Flame, Clock, Trophy, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

// Steps 1-7: grouped momentum questions (client-side only, no DB)
const MOMENTUM_STEPS = [
  {
    step: 1,
    icon: Zap,
    title: "LET'S GET STARTED",
    subtitle: 'Quick intro',
    fields: [
      { key: 'name', label: 'What is your name?', type: 'text', placeholder: 'Your full name' },
      { key: 'manager', label: "Who's your manager?", type: 'text', placeholder: 'Manager name' },
    ],
  },
  {
    step: 2,
    icon: Target,
    title: 'REVENUE GOALS',
    subtitle: 'Dream big',
    fields: [
      { key: 'revenue_goal', label: "What's your revenue goal for year 1?", type: 'text', placeholder: '$50,000' },
      { key: 'timeline', label: 'How quickly do you want to hit it?', type: 'text', placeholder: '6 months, 12 months...' },
    ],
  },
  {
    step: 3,
    icon: Heart,
    title: 'YOUR WHY',
    subtitle: 'This is what keeps you going',
    fields: [
      { key: 'why', label: 'Why are you doing this? What drives you?', type: 'textarea', placeholder: 'My family, my future, proving myself...' },
    ],
  },
  {
    step: 4,
    icon: Flame,
    title: 'EXCITEMENT CHECK',
    subtitle: 'Be honest',
    fields: [
      { key: 'excitement', label: 'On a scale of 1-10, how excited are you to start?', type: 'scale', placeholder: '' },
    ],
  },
  {
    step: 5,
    icon: Clock,
    title: 'COMMITMENT',
    subtitle: 'Success takes sacrifice',
    fields: [
      { key: 'hours', label: 'How many hours per week are you committed to?', type: 'text', placeholder: '20, 30, 40+...' },
      { key: 'sacrifice', label: "What's one thing you're willing to sacrifice to succeed?", type: 'text', placeholder: 'Late nights, comfort zone...' },
    ],
  },
  {
    step: 6,
    icon: Trophy,
    title: '90-DAY VISION',
    subtitle: 'See it, believe it',
    fields: [
      { key: 'ninety_day', label: 'What does success look like for you in 90 days?', type: 'textarea', placeholder: 'Describe your ideal situation...' },
    ],
  },
  {
    step: 7,
    icon: Rocket,
    title: "YOU'RE READY",
    subtitle: 'One last thing',
    fields: [
      { key: 'promise', label: "What do you want to tell yourself when things get hard?", type: 'textarea', placeholder: "Don't quit. Remember why you started..." },
    ],
  },
];

function getStoredStep(): number {
  try {
    return parseInt(localStorage.getItem('bootcamp_momentum_step') || '1', 10);
  } catch { return 1; }
}

function setStoredStep(step: number) {
  localStorage.setItem('bootcamp_momentum_step', String(step));
}

export function markMomentumComplete() {
  localStorage.setItem('bootcamp_momentum_complete', 'true');
}

export function isMomentumComplete(): boolean {
  return localStorage.getItem('bootcamp_momentum_complete') === 'true';
}

export default function BootcampMomentum() {
  const navigate = useNavigate();
  const { progress, isLoading } = useBootcamp();
  const [currentStep, setCurrentStep] = useState(getStoredStep);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scaleValue, setScaleValue] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && isMomentumComplete()) {
      navigate('/bootcamp/phase-1', { replace: true });
    }
  }, [isLoading, navigate]);

  const stepData = MOMENTUM_STEPS[currentStep - 1];
  if (!stepData) return null;

  const allFieldsFilled = stepData.fields.every(f => {
    if (f.type === 'scale') return scaleValue !== null;
    return (answers[f.key] || '').trim().length > 0;
  });

  const handleNext = () => {
    setStoredStep(currentStep + 1);
    if (currentStep >= 7) {
      markMomentumComplete();
      navigate('/bootcamp/phase-1', { replace: true });
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  const Icon = stepData.icon;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">
              Step {currentStep} of 10
            </span>
            <span className="text-xs text-white/30">
              {currentStep <= 7 ? 'Momentum Builder' : 'Boot Camp'}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-white/60 to-white rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 10) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex items-center justify-between mt-3 px-1">
            {Array.from({ length: 10 }, (_, i) => {
              const stepNum = i + 1;
              const isDone = stepNum < currentStep || (stepNum <= 7 && isMomentumComplete());
              const isCurrent = stepNum === currentStep;
              const isPhase = stepNum > 7;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                      isDone
                        ? "bg-white text-black"
                        : isCurrent
                          ? "border-2 border-white text-white"
                          : "border border-white/15 text-white/20"
                    )}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{stepData.title}</h1>
              <p className="text-white/40 text-xs uppercase tracking-wider">{stepData.subtitle}</p>
            </div>
          </div>

          <div className="space-y-5">
            {stepData.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-semibold text-white/70 mb-2">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={answers[field.key] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[100px] resize-none"
                  />
                ) : field.type === 'scale' ? (
                  <div className="flex items-center justify-between gap-1 mt-2">
                    {Array.from({ length: 10 }, (_, i) => {
                      const val = i + 1;
                      const selected = scaleValue === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setScaleValue(val)}
                          className={cn(
                            "w-9 h-9 rounded-lg text-sm font-bold transition-all",
                            selected
                              ? val >= 8
                                ? "bg-green-500 text-black scale-110 shadow-lg shadow-green-500/30"
                                : val >= 5
                                  ? "bg-yellow-500 text-black scale-110"
                                  : "bg-red-500 text-white scale-110"
                              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                          )}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={answers[field.key] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={!allFieldsFilled}
            size="lg"
            className="w-full mt-8 bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30 gap-2"
          >
            {currentStep === 7 ? "LET'S GO →" : 'NEXT'}
            {currentStep < 7 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
