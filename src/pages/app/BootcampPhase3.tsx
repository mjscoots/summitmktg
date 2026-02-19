import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AGREEMENT_TEXT = `COMMITMENT AGREEMENT

I, the undersigned, hereby commit to the following terms and conditions as a member of this organization:

1. DEDICATION & EFFORT
I commit to giving my absolute best effort every single day. I understand that success in this role requires consistent dedication, discipline, and a willingness to push beyond my comfort zone.

2. ATTENDANCE & PUNCTUALITY
I will arrive on time to all scheduled meetings, training sessions, and team activities. I understand that my presence and punctuality directly impact my team and my own success.

3. PROFESSIONAL CONDUCT
I will maintain the highest standards of professional conduct at all times. I will represent myself, my team, and this organization with integrity and respect.

4. CONTINUOUS IMPROVEMENT
I commit to continuously improving my skills through daily practice, training completion, and applying feedback from my leadership team.

5. TEAM COMMITMENT
I will support my teammates, participate actively in team activities, and contribute to a positive team culture. I understand that individual success is built on team success.

6. FINANCIAL RESPONSIBILITY
I understand the financial structure of this opportunity and take full responsibility for my own financial outcomes based on my effort and performance.

7. COMMUNICATION
I will maintain open and honest communication with my manager and team. I will voice concerns constructively and seek solutions rather than dwelling on problems.

8. ACCOUNTABILITY
I hold myself accountable for my results. I will not make excuses but instead focus on what I can control and improve.

By signing below, I acknowledge that I have read, understood, and agree to uphold all terms outlined in this commitment agreement.`;

const COMPLETION_CHECKLIST = [
  'I have read and understood the full commitment agreement',
  'I agree to uphold all terms outlined above',
  'I am ready to commit fully to this opportunity',
];

export default function BootcampPhase3() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, isLoading, updatePhase } = useBootcamp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const [checked, setChecked] = useState<boolean[]>(new Array(COMPLETION_CHECKLIST.length).fill(false));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !progress?.phase_2_complete) {
      navigate('/bootcamp/phase-2', { replace: true });
    }
    if (!isLoading && progress?.phase_3_complete) {
      navigate('/app', { replace: true });
    }
  }, [isLoading, progress, navigate]);

  // Signature pad setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const allReady =
    checked.every(Boolean) &&
    startDate &&
    endDate &&
    signatureName.trim().length > 1 &&
    hasSigned;

  const handleSubmit = async () => {
    if (!allReady || !user || submitting) return;
    setSubmitting(true);

    try {
      const sigData = canvasRef.current?.toDataURL('image/png') || '';

      const success = await updatePhase(3, {
        agreement_start_date: startDate,
        agreement_end_date: endDate,
        signature_name: signatureName,
        signature_data: sigData,
      });

      if (success) {
        toast({ title: 'Boot Camp Complete!', description: 'Welcome to the Summit.' });
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
      <div className="w-full max-w-2xl mx-auto">
        <PhaseIndicator current={10} progress={progress} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            FINAL COMMITMENT
          </h1>
          <p className="text-white/40 text-sm mb-6">STEP 10</p>

          {/* Date fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-white/60 text-xs">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs">End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
          </div>

          {/* Agreement block */}
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-6 max-h-80 overflow-y-auto">
            <pre className="text-white/50 text-xs whitespace-pre-wrap font-sans leading-relaxed">
              {AGREEMENT_TEXT}
            </pre>
          </div>

          {/* Completion checklist */}
          <div className="space-y-3 mb-6">
            {COMPLETION_CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(val) => {
                    const next = [...checked];
                    next[i] = !!val;
                    setChecked(next);
                  }}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span className={`text-sm ${checked[i] ? 'text-white' : 'text-white/50'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          {/* Signature section */}
          <div className="border-t border-white/10 pt-6 mb-6">
            <h2 className="text-lg font-black text-white mb-4">SIGNATURE</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-white/60 text-xs">Typed Name *</Label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Type your full name"
                  className="bg-white/5 border-white/10 text-white mt-1 placeholder:text-white/20"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-white/60 text-xs">Draw Signature *</Label>
                  {hasSigned && (
                    <button onClick={clearSignature} className="text-xs text-white/40 hover:text-white">
                      Clear
                    </button>
                  )}
                </div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full border border-white/10 rounded-lg bg-white cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSigned && (
                  <p className="text-xs text-white/20 mt-1">Draw your signature above</p>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allReady || submitting}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30"
          >
            {submitting ? 'Saving...' : 'COMPLETE FINAL COMMITMENT'}
          </Button>
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
