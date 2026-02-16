import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Upload, Video, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && progress?.phase_1_complete) {
      navigate('/bootcamp/phase-2', { replace: true });
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

  const handleSubmit = async () => {
    if (!videoFile || !user || submitting) return;
    setSubmitting(true);

    try {
      setUploading(true);
      const ext = videoFile.name.split('.').pop();
      const path = `${user.id}/sunblock.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('bootcamp-videos')
        .upload(path, videoFile, { upsert: true });
      if (uploadError) throw uploadError;
      setUploading(false);

      const success = await updatePhase(1, { sunblock_video_url: path });
      if (success) {
        navigate('/bootcamp/phase-2', { replace: true });
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
        <PhaseIndicator current={1} progress={progress} />

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            SUNBLOCK
          </h1>
          <p className="text-white/40 text-sm mb-6">MODULE 1</p>

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

          {/* Upload area */}
          <div className="mb-8">
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

          <Button
            onClick={handleSubmit}
            disabled={!videoFile || submitting}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : submitting ? 'Saving...' : 'COMPLETE MODULE →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ current, progress }: { current: number; progress: any }) {
  const labels = ['SUNBLOCK', 'MOTIVATION', 'COMMITMENT'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((p, i) => {
        const done = p === 1 ? progress?.phase_1_complete : p === 2 ? progress?.phase_2_complete : progress?.phase_3_complete;
        return (
          <div key={p} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  done ? 'bg-white text-black border-white' : p === current ? 'border-white text-white' : 'border-white/20 text-white/20'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : p}
              </div>
              <span className={`text-[9px] mt-1 ${done || p === current ? 'text-white/60' : 'text-white/20'}`}>{labels[i]}</span>
            </div>
            {i < 2 && <div className={`w-12 h-0.5 mx-1 mb-4 ${done ? 'bg-white' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}
