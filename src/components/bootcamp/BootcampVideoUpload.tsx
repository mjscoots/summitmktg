import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { Upload, Video, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BootcampVideoUploadProps {
  userId: string;
  storagePath: string; // e.g. "userId/sunblock"
  onUploadComplete: (path: string) => void;
  disabled?: boolean;
}

const VALID_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const MAX_SIZE = 1024 * 1024 * 1024; // 1GB

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function BootcampVideoUpload({ userId, storagePath, onUploadComplete, disabled }: BootcampVideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const uploadRef = useRef<tus.Upload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selected: File) => {
    if (!VALID_TYPES.includes(selected.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload MP4, MOV, WebM, or AVI', variant: 'destructive' });
      return;
    }
    if (selected.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Max file size is 1GB', variant: 'destructive' });
      return;
    }
    setFile(selected);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const startUpload = useCallback(async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() || 'mp4';
      const filePath = `${storagePath}.${ext}`;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const upload = new tus.Upload(file, {
        endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'bootcamp-videos',
          objectName: filePath,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (error) => {
          console.error('[BootcampUpload] TUS error:', error);
          setErrorMsg(error.message || 'Upload failed. Please try again.');
          setStatus('error');
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(pct);
        },
        onSuccess: () => {
          setStatus('success');
          setProgress(100);
          onUploadComplete(filePath);
        },
      });

      uploadRef.current = upload;

      // Check for previous uploads to resume
      const prevUploads = await upload.findPreviousUploads();
      if (prevUploads.length > 0) {
        upload.resumeFromPreviousUpload(prevUploads[0]);
      }

      upload.start();
    } catch (err: any) {
      console.error('[BootcampUpload] Error:', err);
      setErrorMsg(err.message || 'Upload failed');
      setStatus('error');
    }
  }, [file, storagePath, onUploadComplete]);

  const cancelUpload = () => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Idle — no file selected
  if (!file && status === 'idle') {
    return (
      <div className="mb-8">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-lg p-8 cursor-pointer hover:border-white/20 transition-colors">
          <Upload className="w-8 h-8 text-white/30" />
          <span className="text-sm text-white/40">Tap to upload video</span>
          <span className="text-xs text-white/20">MP4, MOV, WebM, AVI · Max 1GB</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-3">
      {/* File selected — ready to upload */}
      {file && status === 'idle' && (
        <>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <Video className="w-5 h-5 text-white/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{file.name}</p>
              <p className="text-xs text-white/30">{formatSize(file.size)}</p>
            </div>
            <button onClick={cancelUpload} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={startUpload}
            disabled={disabled}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base h-12"
          >
            UPLOAD & COMPLETE →
          </Button>
        </>
      )}

      {/* Uploading */}
      {status === 'uploading' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-white animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Uploading… {progress}%</p>
              <p className="text-xs text-white/30">Don't close this page</p>
            </div>
            <button onClick={cancelUpload} className="text-white/30 hover:text-white text-xs">
              Cancel
            </button>
          </div>
          <Progress value={progress} className="h-2" />
          {file && (
            <p className="text-[10px] text-white/20 text-center">
              {formatSize(file.size * (progress / 100))} / {formatSize(file.size)}
            </p>
          )}
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="flex items-center gap-3 bg-primary/10 border border-emerald-500/20 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-primary/80 font-medium">Upload complete!</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium">Upload failed</p>
              <p className="text-xs text-red-300/60">{errorMsg}</p>
            </div>
          </div>
          <Button
            onClick={startUpload}
            variant="outline"
            size="sm"
            className="w-full border-white/10 text-white/60"
          >
            Retry Upload
          </Button>
          <button onClick={cancelUpload} className="w-full text-xs text-white/30 hover:text-white/50">
            Choose different file
          </button>
        </div>
      )}
    </div>
  );
}
