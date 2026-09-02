import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatAttachmentUrl } from '@/lib/chatAttachments';
import { prepareChatImage } from '@/lib/chatImage';
import { Paperclip, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';



const IMAGE_PREFIX = 'img:';
const FILE_PREFIX = 'file:';
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export function isImageMessage(content: string) {
  return content.startsWith(IMAGE_PREFIX);
}

export function isFileMessage(content: string) {
  return content.startsWith(FILE_PREFIX);
}

export function getImageUrl(content: string) {
  return content.slice(IMAGE_PREFIX.length);
}

export function getFileInfo(content: string) {
  try {
    const json = content.slice(FILE_PREFIX.length);
    return JSON.parse(json) as { url: string; name: string; size: number };
  } catch {
    return null;
  }
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function isImageFile(name: string) {
  return IMAGE_EXTS.some(ext => name.toLowerCase().endsWith(ext));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadChatFile(file: File, userId: string, onSend: (content: string) => Promise<void>) {
  if (file.size > MAX_SIZE) {
    toast.error('File too large (max 100MB)');
    return;
  }

  // Photos are downscaled and re-encoded in the browser, which also drops EXIF.
  const prepared = await prepareChatImage(file);

  const ext = prepared ? prepared.ext : (file.name.split('.').pop() || 'png');
  const path = `${userId}/${Date.now()}.${ext}`;

  let blob: Blob;
  if (prepared) {
    blob = prepared.blob;
  } else {
    // Read the file into an ArrayBuffer first to ensure drag-and-drop files
    // are fully read before uploading (prevents 0-byte uploads)
    const arrayBuffer = await file.arrayBuffer();
    blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' });
  }

  const { error: uploadError } = await supabase.storage
    .from('chat-uploads')
    .upload(path, blob, { contentType: blob.type || 'application/octet-stream' });

  if (uploadError) throw uploadError;

  // Private bucket: store the object path and sign it at read time.
  if (prepared || isImageFile(file.name)) {
    await onSend(`${IMAGE_PREFIX}${path}`);
  } else {
    const fileInfo = { url: path, name: file.name, size: file.size };
    await onSend(`${FILE_PREFIX}${JSON.stringify(fileInfo)}`);
  }

}


interface ChatImageUploadProps {
  onSend: (content: string) => Promise<void>;
}

export function ChatImageUpload({ onSend }: ChatImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      await uploadChatFile(file, user.id, onSend);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-md transition-all flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
        title="Attach file"
      >
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
      </button>
    </>
  );
}

// Render component for image messages
export function ChatImage({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const { url: signed, failed } = useChatAttachmentUrl(url);
  const pinchRef = useRef(0);

  if (failed) {
    return <p className="text-xs text-muted-foreground">Image unavailable</p>;
  }
  if (!signed) {
    return <div className="h-[160px] w-[220px] animate-pulse rounded-lg bg-muted/40" />;
  }

  const close = () => { setExpanded(false); setZoomed(false); };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinchRef.current) { pinchRef.current = dist; return; }
    if (dist > pinchRef.current * 1.2) setZoomed(true);
    if (dist < pinchRef.current * 0.8) setZoomed(false);
  };

  return (
    <>
      <img loading="lazy" decoding="async"
        src={signed}
        alt="Shared image"
        className="max-w-[300px] max-h-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/90 p-4" onClick={close}>
          <button
            aria-label="Close photo"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:text-white"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>
          <img loading="lazy" decoding="async"
            src={signed}
            alt="Shared image"
            onClick={(e) => { e.stopPropagation(); }}
            onDoubleClick={(e) => { e.stopPropagation(); setZoomed(z => !z); }}
            onTouchStart={() => { pinchRef.current = 0; }}
            onTouchMove={handleTouchMove}
            className={
              zoomed
                ? 'max-w-none rounded-lg transition-transform duration-200 scale-[2] origin-center'
                : 'max-h-full max-w-full rounded-lg transition-transform duration-200'
            }
          />
        </div>
      )}
    </>

  );
}

// Render component for file messages
export function ChatFile({ info }: { info: { url: string; name: string; size: number } }) {
  const { url: signed } = useChatAttachmentUrl(info.url);

  return (
    <a
      href={signed ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!signed}
      className="inline-flex items-center gap-2 p-2.5 bg-muted/60 border border-border/50 rounded-lg hover:bg-muted transition-colors max-w-[280px]"
    >
      <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{info.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(info.size)}</p>
      </div>
    </a>
  );
}

