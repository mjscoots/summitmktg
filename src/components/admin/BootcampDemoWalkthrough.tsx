import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Lock, Zap, Target, Heart, Flame, Clock, Trophy, Rocket, CheckCircle2, Upload, Video, FileText, Mountain } from 'lucide-react';
import { cn } from '@/lib/utils';

// All demo screens a rookie would see
const DEMO_SCREENS = [
  {
    id: 'lock',
    title: 'Summer Checklist Lock Screen',
    description: 'This is what rookies see when they first log in — they cannot access the app until the Summer Checklist is complete.',
    render: () => (
      <div className="bg-black rounded-xl p-6 text-center space-y-4 max-h-[60vh] overflow-y-auto">
        <Lock className="w-10 h-10 text-white/60 mx-auto" />
        <h2 className="text-xl font-black text-white tracking-tight">SUMMER CHECKLIST REQUIRED</h2>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          <p className="text-red-400 text-sm font-semibold">🔒 You must complete the Summer Checklist before you can access the app.</p>
        </div>
        <p className="text-blue-400 text-sm font-black bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5 inline-block">
          ⚡ Most reps finish in under 15 minutes
        </p>
        <div className="space-y-1.5 text-left">
          {['Get Started', 'Revenue Goals', 'Your Why', 'Excitement', 'Commitment', '90-Day Vision', "You're Ready"].map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] text-white/25 text-xs">
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              <span className="font-semibold">{s}</span>
            </div>
          ))}
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold px-2 mt-3 mb-1 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Summer Checklist Modules
          </div>
          {['Sunblock', 'Motivation', 'Final Commitment'].map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] text-white/25 text-xs">
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">{i + 8}</span>
              <span className="font-semibold">{s}</span>
            </div>
          ))}
        </div>
        <div className="bg-white text-black font-black text-base py-3 rounded-lg">START NOW</div>
      </div>
    ),
  },
  ...([
    { step: 1, icon: Zap, title: "LET'S GET STARTED", subtitle: 'Quick intro', fields: ['What is your name?', "Who's your manager?"] },
    { step: 2, icon: Target, title: 'REVENUE GOALS', subtitle: 'Dream big', fields: ["What's your revenue goal for the summer?"] },
    { step: 3, icon: Heart, title: 'YOUR WHY', subtitle: 'This is what keeps you going', fields: ['Why are you doing this? What drives you?'] },
    { step: 4, icon: Flame, title: 'EXCITEMENT CHECK', subtitle: 'Be honest', fields: ['On a scale of 1-10, how excited are you to start?'] },
    { step: 5, icon: Clock, title: 'COMMITMENT', subtitle: 'Success takes sacrifice', fields: ['How many hours per week are you committed to?', "What's one thing you're willing to sacrifice to succeed?"] },
    { step: 6, icon: Trophy, title: '90-DAY VISION', subtitle: 'See it, believe it', fields: ['What does success look like for you in 90 days?'] },
    { step: 7, icon: Rocket, title: "YOU'RE READY", subtitle: 'One last thing', fields: ["What do you want to tell yourself when things get hard?"] },
  ].map(s => ({
    id: `momentum-${s.step}`,
    title: `Momentum Step ${s.step}: ${s.title}`,
    description: `Step ${s.step} of 10 — ${s.subtitle}`,
    render: () => {
      const Icon = s.icon;
      return (
        <div className="bg-black rounded-xl p-6 max-h-[60vh] overflow-y-auto">
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Step {s.step} of 10</span>
            <span className="text-xs text-white/30">Momentum Builder</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-white/60 to-white rounded-full" style={{ width: `${(s.step / 10) * 100}%` }} />
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">{s.title}</h2>
                <p className="text-white/40 text-xs uppercase tracking-wider">{s.subtitle}</p>
              </div>
            </div>
            <div className="space-y-4">
              {s.fields.map((f, i) => (
                <div key={i}>
                  <label className="block text-sm font-semibold text-white/70 mb-2">{f}</label>
                  {s.step === 4 ? (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg bg-white/5 text-white/40 text-sm font-bold flex items-center justify-center">{i + 1}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-10 bg-white/5 border border-white/10 rounded-md" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white/20 text-white font-black text-sm py-2.5 rounded-lg text-center">NEXT</div>
          </div>
        </div>
      );
    },
  }))),
  {
    id: 'phase-1',
    title: 'Phase 1: Sunblock Video',
    description: 'Step 8 of 10 — Rookies record a video answering accountability questions.',
    render: () => (
      <div className="bg-black rounded-xl p-6 max-h-[60vh] overflow-y-auto">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-to-r from-white/60 to-white rounded-full" style={{ width: '80%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">SUNBLOCK</h2>
              <p className="text-white/40 text-xs uppercase tracking-wider">Step 8 of 10</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-4">Record a video answering these questions:</p>
          <ol className="space-y-2 mb-5">
            {['Your name', 'Name of your manager', 'Commitment level (1-10)', 'What to say during weak moments', 'Best advice facing adversity', 'What to say if you want to quit', 'Anything else'].map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-white/50 text-xs">
                <span className="text-white/30 font-bold mt-0.5">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/40 text-xs">Upload video (MP4, MOV, WebM)</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Motivation Video',
    description: 'Step 9 of 10 — Rookies record their motivation and "why" video.',
    render: () => (
      <div className="bg-black rounded-xl p-6 max-h-[60vh] overflow-y-auto">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-to-r from-white/60 to-white rounded-full" style={{ width: '90%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">MOTIVATION</h2>
              <p className="text-white/40 text-xs uppercase tracking-wider">Step 9 of 10</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-4">Record a video answering these questions:</p>
          <ol className="space-y-2 mb-5">
            {['Your name', 'Name of your manager', 'Why are you doing this job?', 'Why does that matter?', 'How can you quantify your why?', 'How much money do you need?', 'Timeline to accomplish this?', 'Year 1-5 milestones'].map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-white/50 text-xs">
                <span className="text-white/30 font-bold mt-0.5">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/40 text-xs">Upload video (MP4, MOV, WebM)</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Final Commitment',
    description: 'Step 10 of 10 — Rookies read the agreement, check off items, and sign.',
    render: () => (
      <div className="bg-black rounded-xl p-6 max-h-[60vh] overflow-y-auto">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-to-r from-white/60 to-white rounded-full" style={{ width: '100%' }} />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">FINAL COMMITMENT</h2>
              <p className="text-white/40 text-xs uppercase tracking-wider">Step 10 of 10</p>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto">
            <p className="text-white/40 text-[11px] leading-relaxed whitespace-pre-line">
              COMMITMENT AGREEMENT{'\n\n'}
              I, the undersigned, hereby commit to giving my absolute best effort every single day...{'\n\n'}
              1. DEDICATION & EFFORT{'\n'}
              2. ATTENDANCE & PUNCTUALITY{'\n'}
              3. PROFESSIONAL CONDUCT{'\n'}
              4. CONTINUOUS IMPROVEMENT{'\n'}
              5. TEAM COMMITMENT{'\n'}
              6. FINANCIAL RESPONSIBILITY{'\n'}
              7. COMMUNICATION{'\n'}
              8. ACCOUNTABILITY
            </p>
          </div>
          <div className="space-y-2 mb-4">
            {['I have read and understood the full commitment agreement', 'I agree to uphold all terms outlined above', 'I am ready to commit fully to this opportunity'].map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50 text-xs">
                <div className="w-4 h-4 border border-white/20 rounded" />
                <span>{c}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Full Name</label>
              <div className="h-9 bg-white/5 border border-white/10 rounded-md" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Signature</label>
              <div className="h-20 bg-white/5 border border-white/10 rounded-md flex items-center justify-center">
                <span className="text-white/20 text-xs">Draw signature here</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white/20 text-white font-black text-sm py-2.5 rounded-lg text-center">COMPLETE CHECKLIST</div>
        </div>
      </div>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard (After Checklist)',
    description: 'After completing the Summer Checklist, the rookie lands on their dashboard.',
    render: () => (
      <div className="bg-background rounded-xl p-6 max-h-[60vh] overflow-y-auto border border-border/20">
        <div className="flex items-center gap-2 mb-4">
          <Mountain className="w-5 h-5 text-primary" />
          <span className="text-sm font-black tracking-tight">SUMMIT</span>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">What's up, Demo Rep</h2>
        <p className="text-sm text-muted-foreground mb-4">Complete training. Build momentum.</p>
        <div className="bg-primary/10 rounded-lg px-4 py-3 mb-4">
          <span className="text-primary font-bold text-sm">🔥 Open Training</span>
        </div>
        <div className="space-y-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-foreground mb-1">📋 Daily Checklist</h3>
            <div className="space-y-1">
              {['Complete 1 training lesson', 'Review your schedule', 'Check announcements'].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 border border-muted-foreground/30 rounded" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-foreground">📢 Announcements</h3>
            <p className="text-xs text-muted-foreground mt-1">Welcome to Summit! Check your training...</p>
          </div>
        </div>
      </div>
    ),
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BootcampDemoWalkthrough({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setStep(0);
    onOpenChange(false);
  };

  const current = DEMO_SCREENS[step];
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-card border-border">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Mountain className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Demo Mode — Screen {step + 1} of {DEMO_SCREENS.length}
            </span>
          </div>
          <h3 className="text-sm font-bold text-foreground">{current.title}</h3>
          <p className="text-xs text-muted-foreground">{current.description}</p>
        </div>

        {/* Progress bar */}
        <div className="px-5">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / DEMO_SCREENS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Screen preview */}
        <div className="px-5 py-4">
          {current.render()}
        </div>

        {/* Navigation */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </Button>

          <span className="text-[10px] text-muted-foreground">
            {step + 1} / {DEMO_SCREENS.length}
          </span>

          {step < DEMO_SCREENS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              className="gap-1 text-xs font-bold"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleClose}
              className="text-xs font-bold"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
