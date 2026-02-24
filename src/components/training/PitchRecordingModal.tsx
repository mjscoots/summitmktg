import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Upload, Square, Circle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PitchRecordingModalProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  attemptNumber: number;
  onSubmitted: () => void;
}

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading' | 'done';

export function PitchRecordingModal({
  open,
  onClose,
  lessonId,
  lessonTitle,
  attemptNumber,
  onSubmitted,
}: PitchRecordingModalProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'choose' | 'record' | 'upload'>('choose');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_DURATION = 300; // 5 minutes

  // Clean up on unmount/close
  useEffect(() => {
    if (!open) {
      stopRecording();
      setMode('choose');
      setRecordingState('idle');
      setRecordedBlob(null);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setRecordingTime(0);
    }
  }, [open]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecordingState('preview');
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t + 1 >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large. Max 500MB.');
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRecordingState('preview');
  };

  const handleSubmit = async () => {
    if (!user) return;
    const fileToUpload = selectedFile || (recordedBlob ? new File([recordedBlob], 'pitch.webm', { type: 'video/webm' }) : null);
    if (!fileToUpload) return;

    setRecordingState('uploading');
    setUploadProgress(10);

    try {
      const ext = selectedFile ? selectedFile.name.split('.').pop() : 'webm';
      const fileName = `${user.id}/${lessonId}-attempt-${attemptNumber}-${Date.now()}.${ext}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('pitch-approval-videos')
        .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Create the pitch approval request
      const { error: insertError } = await supabase
        .from('pitch_approval_requests')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          video_url: fileName,
          status: 'pending',
          attempt_number: attemptNumber,
        });

      if (insertError) throw insertError;

      setUploadProgress(90);

      // Notify manager
      if (profile?.direct_manager) {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('full_name', profile.direct_manager)
          .maybeSingle();

        if (managerProfile) {
          await supabase.from('user_notifications').insert({
            user_id: managerProfile.user_id,
            title: `🎤 ${profile.full_name} submitted their ${lessonTitle} pitch`,
            message: `Review and approve/reject the pitch recording.`,
            link: '/app/pitch-approvals',
          });
        }
      }

      setUploadProgress(100);
      setRecordingState('done');
      toast.success('Pitch submitted for approval!');

      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to submit pitch');
      setRecordingState('preview');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stopRecording(); onClose(); } }}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Record Pitch — {lessonTitle}
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' && recordingState === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Attempt #{attemptNumber} — Max 5 minutes
            </p>
            <Button
              onClick={() => { setMode('record'); startRecording(); }}
              className="w-full gap-2 h-12"
              variant="outline"
            >
              <Circle className="w-5 h-5 text-destructive" />
              Record with Camera
            </Button>
            <div className="relative">
              <Button variant="outline" className="w-full gap-2 h-12" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Upload Video File
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
              </Button>
            </div>
          </div>
        )}

        {mode === 'record' && recordingState === 'recording' && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-white text-sm font-mono">{formatTime(recordingTime)}</span>
              </div>
              <div className="absolute top-3 right-3 text-xs text-white/60 bg-black/60 rounded-full px-2 py-0.5">
                Max {formatTime(MAX_DURATION)}
              </div>
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="w-full gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </Button>
          </div>
        )}

        {recordingState === 'preview' && previewUrl && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={previewVideoRef}
                src={previewUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRecordingState('idle');
                  setRecordedBlob(null);
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setMode('choose');
                }}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button onClick={handleSubmit} className="flex-1 gap-2 bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Submit for Approval
              </Button>
            </div>
          </div>
        )}

        {recordingState === 'uploading' && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Uploading pitch...</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Please don't close this window</p>
          </div>
        )}

        {recordingState === 'done' && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <p className="text-lg font-semibold text-foreground">Pitch Submitted!</p>
            <p className="text-sm text-muted-foreground">Your manager will review it shortly.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
