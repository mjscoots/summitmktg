import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Upload, Video, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VIDEO_QUESTIONS = [
  'Name',
  'Manager',
  'Commitment 1–10',
  'What will you say when you want to quit?',
  'Advice to yourself during adversity',
  'What do you want us to say if you try to quit?',
  'Anything else your future weak self needs to hear',
];

const VIDEO_CHECKLIST = [
  'Good lighting',
  'Clear audio',
  'All questions answered',
  'Video uploaded',
];

export default function BootcampPhase3() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, isLoading, updatePhase } = useBootcamp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoChecked, setVideoChecked] = useState<boolean[]>(new Array(VIDEO_CHECKLIST.length).fill(false));
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload MP4, MOV, WebM, or AVI', variant: 'destructive' });
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 1GB', variant: 'destructive' });
      return;
    }
    setVideoFile(file);
  };

  const allReady =
    videoFile &&
    videoChecked.every(Boolean) &&
    startDate &&
    endDate &&
    signatureName.trim().length > 1 &&
    hasSigned &&
    acceptTerms;

  const handleSubmit = async () => {
    if (!allReady || !user || submitting) return;
    setSubmitting(true);

    try {
      setUploading(true);
      const ext = videoFile.name.split('.').pop();
      const path = `${user.id}/phase-3-commitment.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('bootcamp-videos')
        .upload(path, videoFile, { upsert: true });
      if (uploadError) throw uploadError;
      setUploading(false);

      // Get signature data
      const sigData = canvasRef.current?.toDataURL('image/png') || '';

      const success = await updatePhase(3, {
        phase_3_video_url: path,
        commitment_start_date: startDate,
        commitment_end_date: endDate,
        signature_name: signatureName,
        signature_data: sigData,
      });

      if (success) {
        toast({ title: '🎉 Boot Camp Complete!', description: 'Welcome to The Academy.' });
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setUploading(false);
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
        <PhaseIndicator current={3} progress={progress} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            PHASE 3
          </h1>
          <p className="text-white/40 text-sm mb-6">FINAL COMMITMENT</p>

          {/* Video questions */}
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-6">
            <p className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">
              Record a video answering:
            </p>
            <ul className="space-y-1.5">
              {VIDEO_QUESTIONS.map((q, i) => (
                <li key={i} className="text-white/50 text-sm flex items-start gap-2">
                  <span className="text-white/20 text-xs mt-0.5">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Video upload */}
          <div className="mb-6">
            {videoFile ? (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <Video className="w-5 h-5 text-white/60 shrink-0" />
                <span className="text-sm text-white truncate flex-1">{videoFile.name}</span>
                <button onClick={() => setVideoFile(null)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-lg p-8 cursor-pointer hover:border-white/20 transition-colors">
                <Upload className="w-8 h-8 text-white/30" />
                <span className="text-sm text-white/40">Click to upload video</span>
                <span className="text-xs text-white/20">MP4, MOV, WebM, AVI · Max 1GB</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Video checklist */}
          <div className="space-y-3 mb-8">
            {VIDEO_CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={videoChecked[i]}
                  onCheckedChange={(val) => {
                    const next = [...videoChecked];
                    next[i] = !!val;
                    setVideoChecked(next);
                  }}
                  className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span className={`text-sm ${videoChecked[i] ? 'text-white' : 'text-white/50'}`}>{item}</span>
              </label>
            ))}
          </div>

          {/* Commitment form */}
          <div className="border-t border-white/10 pt-6 mb-6">
            <h2 className="text-lg font-black text-white mb-4">FINAL COMMITMENT AGREEMENT</h2>

            <div className="space-y-4">
              <div>
                <Label className="text-white/60 text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Signature (Typed Name)</Label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Type your full name"
                  className="bg-white/5 border-white/10 text-white mt-1 placeholder:text-white/20"
                />
              </div>

              {/* Signature pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-white/60 text-xs">Digital Signature</Label>
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
                  className="w-full border border-white/10 rounded-lg bg-white/[0.02] cursor-crosshair touch-none"
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

              {/* Date auto-filled */}
              <div>
                <Label className="text-white/60 text-xs">Date</Label>
                <Input
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="bg-white/5 border-white/10 text-white/40 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-8">
            <Checkbox
              checked={acceptTerms}
              onCheckedChange={(val) => setAcceptTerms(!!val)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
            <span className="text-xs text-white/50">
              I accept full responsibility for my performance and understand the financial obligations outlined.
            </span>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={!allReady || submitting}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30"
          >
            {uploading ? 'Uploading...' : submitting ? 'Saving...' : 'SUBMIT & COMPLETE BOOT CAMP'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ current, progress }: { current: number; progress: any }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((p, i) => {
        const done = p === 1 ? progress?.phase_1_complete : p === 2 ? progress?.phase_2_complete : progress?.phase_3_complete;
        return (
          <div key={p} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done ? 'bg-white text-black border-white' : p === current ? 'border-white text-white' : 'border-white/20 text-white/20'
              }`}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : p}
            </div>
            {i < 2 && <div className={`w-12 h-0.5 mx-1 ${done ? 'bg-white' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}
