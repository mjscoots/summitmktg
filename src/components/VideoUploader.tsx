import { useState, useCallback } from 'react';
import { Upload, X, Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onUploadComplete: (url: string, fileName: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function VideoUploader({ onUploadComplete, onError, className }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
  const maxSize = 500 * 1024 * 1024; // 500MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, or WebM files.';
    }
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 500MB.';
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadState('error');
      onError?.(error);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadState('idle');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('training-videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Store the file path (not full URL) - we'll generate signed URLs on demand
      // Format: training-videos/filename for database storage
      const storagePath = fileName;

      setProgress(100);
      setUploadState('success');
      // Pass the storage path - VideoPlayer will create signed URLs as needed
      onUploadComplete(storagePath, fileName);
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.message || 'Upload failed. Please try again.';
      setErrorMessage(message);
      setUploadState('error');
      onError?.(message);
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50",
          uploadState === 'error' && "border-destructive bg-destructive/5",
          uploadState === 'success' && "border-primary bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploadState === 'uploading'}
        />

        {uploadState === 'idle' && !selectedFile && (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Drop your video here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              MP4, MOV, or WebM • Max 500MB
            </p>
          </div>
        )}

        {selectedFile && uploadState === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Video className="w-10 h-10 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetUploader();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {uploadState === 'uploading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">Uploading...</p>
            <Progress value={progress} className="max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">
              Please don't close this page
            </p>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto text-primary" />
            <p className="text-lg font-medium text-foreground">Upload Complete!</p>
            <Button variant="outline" onClick={resetUploader}>
              Upload Another
            </Button>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-lg font-medium text-foreground">Upload Failed</p>
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" onClick={resetUploader}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Upload button */}
      {selectedFile && uploadState === 'idle' && (
        <Button onClick={uploadFile} className="w-full" size="lg">
          <Upload className="w-4 h-4 mr-2" />
          Upload Video
        </Button>
      )}
    </div>
  );
}
