import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Upload, Video, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VIDEO_CHECKLIST = [
  'Good lighting',
  'Clear audio',
  'All questions answered',
  'Video uploaded',
];

const QUESTIONS = [
  'Full Name',
  'Manager Name',
  'Why are you doing this even though it\'s difficult?',
  'Why does that matter?',
  'Why does that matter? (deeper level)',
  'Quantify your why (money goal)',
  'Years to accomplish (max 5)',
  'What must you do years 1–5',
];

export default function BootcampPhase2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, isLoading, updatePhase } = useBootcamp();
  const [checked, setChecked] = useState<boolean[]>(new Array(VIDEO_CHECKLIST.length).fill(false));
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !progress?.phase_1_complete) {
      navigate('/bootcamp/phase-1', { replace: true });
    }
    if (!isLoading && progress?.phase_2_complete) {
      navigate('/bootcamp/phase-3', { replace: true });
    }
  }, [isLoading, progress, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload MP4, MOV, WebM, or AVI', variant: 'destructive' });
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 1GB', variant: 'destructive' });
      return;
    }
    setVideoFile(file);
  };

  const allReady = videoFile && checked.every(Boolean);

  const handleSubmit = async () => {
    if (!allReady || !user || submitting) return;
    setSubmitting(true);

    try {
      // Upload video
      setUploading(true);
      const ext = videoFile.name.split('.').pop();
      const path = `${user.id}/phase-2-motivation.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('bootcamp-videos')
        .upload(path, videoFile, { upsert: true });

      if (uploadError) throw uploadError;
      setUploading(false);

      const success = await updatePhase(2, { phase_2_video_url: path });
      if (success) {
        navigate('/bootcamp/phase-3', { replace: true });
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <PhaseIndicator current={2} progress={progress} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            PHASE 2
          </h1>
          <p className="text-white/40 text-sm mb-6">DEFINE YOUR WHY</p>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-6">
            <p className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wider">
              Record a video answering:
            </p>
            <ul className="space-y-1.5">
              {QUESTIONS.map((q, i) => (
                <li key={i} className="text-white/50 text-sm flex items-start gap-2">
                  <span className="text-white/20 text-xs mt-0.5">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Upload area */}
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

          {/* Checklist */}
          <div className="space-y-3 mb-8">
            {VIDEO_CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(val) => {
                    const next = [...checked];
                    next[i] = !!val;
                    setChecked(next);
                  }}
                  className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span className={`text-sm ${checked[i] ? 'text-white' : 'text-white/50'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allReady || submitting}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30"
          >
            {uploading ? 'Uploading...' : submitting ? 'Saving...' : 'NEXT →'}
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
