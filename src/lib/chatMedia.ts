/**
 * Chat media content prefixes. Older rows use img: with a single path, newer
 * multi photo sends use imgs: with a JSON array, video sends use video:.
 */
export const IMGS_PREFIX = 'imgs:';
export const VIDEO_PREFIX = 'video:';

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_PER_SEND = 10;

export const VIDEO_EXTS = ['.mp4', '.mov', '.webm'];

export function isVideoFile(file: File) {
  if (file.type.startsWith('video/')) return true;
  return VIDEO_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export function buildImagesMessage(paths: string[]) {
  return `${IMGS_PREFIX}${JSON.stringify(paths)}`;
}

export function isImagesMessage(content: string) {
  return content.startsWith(IMGS_PREFIX);
}

export function getImagePaths(content: string): string[] {
  try {
    const parsed = JSON.parse(content.slice(IMGS_PREFIX.length));
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export function buildVideoMessage(path: string) {
  return `${VIDEO_PREFIX}${path}`;
}

export function isVideoMessage(content: string) {
  return content.startsWith(VIDEO_PREFIX);
}

export function getVideoPath(content: string) {
  return content.slice(VIDEO_PREFIX.length).trim();
}

/** Paths a Save action can download from a message, empty when there is none. */
export function mediaPathsFor(content: string): string[] {
  if (isImagesMessage(content)) return getImagePaths(content);
  if (isVideoMessage(content)) return [getVideoPath(content)];
  if (content.startsWith('img:')) return [content.slice('img:'.length)];
  return [];
}

/** Grabs the first frame of a local video file as a poster image data URL. */
export function capturePosterFrame(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.muted = true;
    video.preload = 'metadata';
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
      } catch {
        done(null);
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) return done(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        done(null);
      }
    };
    video.onerror = () => done(null);
    window.setTimeout(() => done(null), 4000);
    video.src = url;
  });
}

/** Downloads a chat attachment from a signed URL. */
export async function saveAttachment(signedUrl: string, name: string) {
  const res = await fetch(signedUrl);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
